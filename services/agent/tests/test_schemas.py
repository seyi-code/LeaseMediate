"""Unit tests for structured schemas – no LLM calls."""
import pytest
from datetime import datetime, timezone
from schemas import (
    ExtractedLeaseTerms,
    IssueClassification,
    DetectedIssue,
    IssueCategory,
    Severity,
    SettlementProposal,
    ProposedRemedy,
    PartyRole,
)

def test_extracted_lease_terms_minimal():
    t = ExtractedLeaseTerms(
        parties=["Alice Tenant", "Bob Landlord"],
        property_address="123 Main St",
        repair_obligations_summary="Landlord handles structural; tenant handles minor",
        confidence=0.9,
    )
    assert t.monthly_rent is None
    assert t.confidence == 0.9

def test_issue_classification():
    ic = IssueClassification(
        issues=[
            DetectedIssue(
                category=IssueCategory.REPAIR,
                description="Broken heater since Jan",
                severity=Severity.HIGH,
                evidence_refs=["doc-1"],
            )
        ],
        overall_summary="Habitability issue around heating",
        recommended_next_steps=["Inspect HVAC", "Temporary heater"],
    )
    assert len(ic.issues) == 1
    assert ic.issues[0].severity == Severity.HIGH

def test_settlement_proposal_requires_disclaimer():
    p = SettlementProposal(
        case_id="case-1",
        summary="Repair heater within 7 days; rent credit $150",
        findings=["Heater non-functional"],
        proposed_remedies=[
            ProposedRemedy(
                type="repair_deadline",
                description="Restore heat",
                deadline=None,
                responsible_party=PartyRole.LANDLORD,
            )
        ],
        generated_at=datetime.now(timezone.utc),
        model_version="test",
        requires_human_review=True,
    )
    assert p.requires_human_review is True
    assert "not constitute legal advice" in p.disclaimer.lower()
