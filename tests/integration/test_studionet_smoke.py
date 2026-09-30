import os
import pytest

pytestmark = pytest.mark.integration


def test_studionet_deploy_and_read():
    if os.getenv("RUN_STUDIONET") != "1":
        pytest.skip("Set RUN_STUDIONET=1 to perform a real Studionet deployment smoke test")

    from gltest import get_contract_factory

    factory = get_contract_factory("Fixpoint")
    contract = factory.deploy(args=[])
    stats = contract.get_stats().call()

    assert int(stats["cases"]) == 0
    assert int(stats["candidates"]) == 0
    assert int(stats["proven"]) == 0
