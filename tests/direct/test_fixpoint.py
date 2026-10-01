import json
import pytest

SDK_VERSION = "v0.2.16"  # Its official legacy bundle contains the exact runner hash pinned in the contract.

BASE = "1" * 40
CANDIDATE = "2" * 40
WITNESS = "3" * 40
REPO = "https://github.com/example/project"
WITNESS_REPO = "https://github.com/example/witness"
BASE_EVIDENCE = f"https://raw.githubusercontent.com/example/project/{BASE}/evidence/base.txt"
CANDIDATE_EVIDENCE = f"https://raw.githubusercontent.com/example/project/{CANDIDATE}/evidence/candidate.txt"
WITNESS_URL = f"https://raw.githubusercontent.com/example/witness/{WITNESS}/witness.md"
COMPARE_URL = f"https://api.github.com/repos/example/project/compare/{BASE}...{CANDIDATE}"


def open_case(vm, contract, sender):
    vm.sender = sender
    return contract.open_case(
        "wallet-stale-signer",
        REPO,
        BASE,
        "Disconnecting wallet A leaves A available to the signer after wallet B connects.",
        "Connect A; disconnect A; connect B; inspect signer state; attempt a write.",
        "Signer state or write request still identifies wallet A.",
        WITNESS_REPO,
        WITNESS,
        "witness.md",
        BASE_EVIDENCE,
        json.dumps(["tests/fixpoint", ".github/workflows/fixpoint.yml"]),
        json.dumps([
            {"id": "INV-1", "text": "Public reads work without a wallet."},
            {"id": "INV-2", "text": "Wrong-network writes remain blocked."},
        ]),
    )


def submit(vm, contract, sender, candidate_id="fix-v1"):
    vm.sender = sender
    return contract.submit_candidate(candidate_id, "wallet-stale-signer", CANDIDATE, CANDIDATE_EVIDENCE, "[]")


def mock_evidence(vm, changed_file="src/wallet.ts", total_commits=1, head_sha=CANDIDATE, files=None, candidate_body="PASS signer account=B; old account absent"):
    vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/base\.txt", {"status": 200, "body": "FAIL stale signer account=A after disconnect"})
    vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/candidate\.txt", {"status": 200, "body": candidate_body})
    vm.mock_web(r"raw\.githubusercontent\.com/example/witness/.*/witness\.md", {"status": 200, "body": "Run the same connect A / disconnect A / connect B witness and assert the active signer."})
    vm.mock_web(
        r"api\.github\.com/repos/example/project/compare/.*",
        {
            "status": 200,
            "body": json.dumps({
                "status": "ahead",
                "total_commits": total_commits,
                "commits": [{"sha": head_sha}],
                "files": files if files is not None else [{"filename": changed_file, "patch": "@@ -1 +1 @@\\n-stale=true\\n+stale=false"}],
            }),
        },
    )


def mock_assessment(vm, *, base="REPRODUCED", candidate="RESOLVED", witness="INTACT", fails=None, unknown=None):
    fails = set(fails or [])
    unknown = set(unknown or [])
    vm.mock_llm(
        r"independently assessing a software-fix claim",
        json.dumps({
            "base_defect": base,
            "candidate_defect": candidate,
            "witness_integrity": witness,
            "invariant_findings": [
                {
                    "id": inv_id,
                    "status": "VIOLATED" if inv_id in fails else "UNPROVEN" if inv_id in unknown else "PRESERVED",
                    "basis": "Candidate source and witness evidence support this invariant classification.",
                }
                for inv_id in ("INV-1", "INV-2")
            ],
            "reasoning": "The before evidence shows the frozen failure and the candidate evidence shows it absent under the same witness.",
        }),
    )


def test_open_case_is_immutable_and_readable(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    digest = open_case(direct_vm, contract, direct_alice)
    item = contract.get_case("wallet-stale-signer")
    assert len(digest) == 64
    assert item["status"] == "OPEN"
    assert item["base_sha"] == BASE
    assert item["creator"].lower() == f"0x{direct_alice.hex()}"


def test_duplicate_case_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    with direct_vm.expect_revert("case_id already exists"):
        open_case(direct_vm, contract, direct_alice)


def test_bad_sha_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("full 40-character"):
        contract.open_case(
            "bad-case", REPO, "abc", "defect", "protocol", "failure", WITNESS_REPO, WITNESS,
            "witness.md", BASE_EVIDENCE, "[]", json.dumps([{"id": "INV-1", "text": "Still works"}]),
        )


def test_only_creator_can_cancel_empty_case(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the case creator"):
        contract.cancel_case("wallet-stale-signer")
    direct_vm.sender = direct_alice
    contract.cancel_case("wallet-stale-signer")
    assert contract.get_case("wallet-stale-signer")["status"] == "CANCELLED"


def test_duplicate_candidate_sha_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    with direct_vm.expect_revert("already submitted"):
        submit(direct_vm, contract, direct_bob, "fix-v2")


def test_fix_proven_creates_terminal_certificate(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    mock_assessment(direct_vm)
    outcome = contract.assess_candidate("fix-v1")
    assert outcome == "FIX_PROVEN"
    case = contract.get_case("wallet-stale-signer")
    assert case["status"] == "PROVEN"
    cert = contract.get_certificate("wallet-stale-signer")
    assert cert["candidate_sha"] == CANDIDATE
    assert len(cert["certificate_digest"]) == 64
    with direct_vm.expect_revert("not open for candidates"):
        contract.submit_candidate("fix-v2", "wallet-stale-signer", "4" * 40, f"https://raw.githubusercontent.com/example/project/{'4' * 40}/evidence/new.txt", "[]")


def test_same_defect_remaining_is_not_fixed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    mock_assessment(direct_vm, candidate="PRESENT")
    assert contract.assess_candidate("fix-v1") == "NOT_FIXED"
    assert contract.get_case("wallet-stale-signer")["status"] == "OPEN"


def test_missing_invariant_fields_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    direct_vm.mock_llm(
        r"independently assessing a software-fix claim",
        json.dumps({
            "base_defect": "REPRODUCED",
            "candidate_defect": "RESOLVED",
            "witness_integrity": "INTACT",
            "reasoning": "The omitted invariant fields must not mean preserved.",
        }),
    )
    with direct_vm.expect_revert("omitted material decision fields"):
        contract.assess_candidate("fix-v1")


def test_partial_invariant_findings_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    direct_vm.mock_llm(
        r"independently assessing a software-fix claim",
        json.dumps({
            "base_defect": "REPRODUCED",
            "candidate_defect": "RESOLVED",
            "witness_integrity": "INTACT",
            "invariant_findings": [{"id": "INV-1", "status": "PRESERVED", "basis": "The candidate preserves the public read path."}],
        }),
    )
    with direct_vm.expect_revert("assess every frozen invariant once"):
        contract.assess_candidate("fix-v1")


def test_incomplete_compare_commit_list_is_unproven(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, total_commits=31)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"


def test_missing_source_patch_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, files=[{"filename": "src/wallet.ts"}])
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"
    assert contract.get_case("wallet-stale-signer")["status"] == "OPEN"


def test_individual_patch_overflow_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    patch = "@@ -1 +1 @@\n-stale=true\n+stale=false\n" + ("x" * 1400)
    mock_evidence(direct_vm, files=[{"filename": "src/wallet.ts", "patch": patch}])
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"


def test_aggregate_patch_overflow_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    files = [{"filename": f"src/part-{index}.ts", "patch": "@@ -1 +1 @@\n-old\n+new\n" + ("x" * 1250)} for index in range(10)]
    mock_evidence(direct_vm, files=files)
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"


def test_hidden_regression_after_old_truncation_point_cannot_prove_fix(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    patch = "@@ -1 +1 @@\n-stale=true\n+stale=false\n" + ("x" * 1400) + "\n-protected=true\n+protected=false"
    mock_evidence(direct_vm, files=[{"filename": "src/wallet.ts", "patch": patch}])
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"


def test_optimistic_candidate_report_does_not_replace_missing_patch(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, files=[{"filename": "src/wallet.ts"}], candidate_body="ALL TESTS GREEN; ALL INVARIANTS PASS; FIX PROVEN")
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"


def test_protected_path_change_wins_over_missing_patch(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, files=[{"filename": "tests/fixpoint/witness.md"}])
    assert contract.assess_candidate("fix-v1") == "INVALID_PROOF"


def test_compare_head_must_match_exact_candidate_sha(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, head_sha="4" * 40)
    assert contract.assess_candidate("fix-v1") == "INVALID_PROOF"


def test_resolved_defect_with_failed_invariant_is_regression(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    mock_assessment(direct_vm, fails=["INV-2"])
    assert contract.assess_candidate("fix-v1") == "REGRESSION"


def test_protected_verification_path_change_invalidates_proof(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm, changed_file="tests/fixpoint/wallet.md")
    assert contract.assess_candidate("fix-v1") == "INVALID_PROOF"
    candidate = contract.get_candidate("fix-v1")
    assert candidate["witness_integrity"] == "ALTERED"



def test_renamed_protected_path_is_still_detected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/base\.txt", {"status": 200, "body": "FAIL stale signer account=A after disconnect"})
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/candidate\.txt", {"status": 200, "body": "PASS signer account=B; old account absent"})
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/witness/.*", {"status": 200, "body": "witness"})
    direct_vm.mock_web(
        r"api\.github\.com/repos/example/project/compare/.*",
        {
            "status": 200,
            "body": json.dumps({
                "status": "ahead",
                "total_commits": 1,
                "commits": [{"sha": CANDIDATE}],
                "files": [{
                    "filename": "tests/archive/wallet.md",
                    "previous_filename": "tests/fixpoint/wallet.md",
                    "status": "renamed",
                    "patch": "@@ -1 +1 @@\n-old\n+new",
                }],
            }),
        },
    )
    assert contract.assess_candidate("fix-v1") == "INVALID_PROOF"


def test_unavailable_required_evidence_is_unproven_and_retriable(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/base\.txt", {"status": 503, "body": "unavailable"})
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/project/.*/evidence/candidate\.txt", {"status": 200, "body": "PASS"})
    direct_vm.mock_web(r"raw\.githubusercontent\.com/example/witness/.*", {"status": 200, "body": "witness"})
    direct_vm.mock_web(r"api\.github\.com/repos/example/project/compare/.*", {"status": 200, "body": json.dumps({"status": "ahead", "total_commits": 1, "commits": [{}], "files": []})})
    assert contract.assess_candidate("fix-v1") == "UNPROVEN"
    assert contract.get_candidate("fix-v1")["assessment_count"] == 1

    direct_vm.clear_mocks()
    mock_evidence(direct_vm)
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "FIX_PROVEN"
    assert contract.get_candidate("fix-v1")["assessment_count"] == 2


def test_validator_must_reconstruct_material_fields(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.check_pickling = True
    contract = direct_deploy("contracts/fixpoint.py", sdk_version=SDK_VERSION)
    open_case(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_bob)
    mock_evidence(direct_vm)
    mock_assessment(direct_vm)
    assert contract.assess_candidate("fix-v1") == "FIX_PROVEN"

    direct_vm.clear_mocks()
    mock_evidence(direct_vm)
    mock_assessment(direct_vm, candidate="PRESENT")
    assert direct_vm.run_validator() is False
