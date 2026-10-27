from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class PartyRole(str, Enum):
    TENANT = "tenant"
    LANDLORD = "landlord"
    MEDIATOR = "mediator"

class IssueCategory(str, Enum):
    REPAIR = "repair"
    RENT = "rent"
    SECURITY_DEPOSIT = "security_deposit"
    HABITABILITY = "habitability"
    ACCESS = "access"
    NOTICE = "notice"
    OTHER = "other"

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ExtractedLeaseTerms(BaseModel):
    parties: List[str]
    property_address: str
    lease_start: Optional[date] = None
    lease_end: Optional[date] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    repair_obligations_summary: str
    notice_period_days: Optional[int] = None
    special_clauses: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)

class DetectedIssue(BaseModel):
    category: IssueCategory
    description: str
    severity: Severity
    evidence_refs: List[str] = Field(default_factory=list)
    alleged_start_date: Optional[date] = None
    requested_remedy: Optional[str] = None

class IssueClassification(BaseModel):
    issues: List[DetectedIssue]
    overall_summary: str
    recommended_next_steps: List[str]

class ProposedRemedy(BaseModel):
    type: str
    description: str
    amount: Optional[float] = None
    deadline: Optional[date] = None
    responsible_party: PartyRole

class SettlementProposal(BaseModel):
    case_id: str
    summary: str
    findings: List[str]
    proposed_remedies: List[ProposedRemedy]
    mutual_releases: List[str] = Field(default_factory=list)
    acceptance_window_days: int = 14
    generated_at: datetime
    model_version: str
    requires_human_review: bool = True
    disclaimer: str = (
        "This is a non-binding proposal generated with AI assistance. "
        "It does not constitute legal advice. Both parties should seek "
        "independent legal counsel before accepting."
    )

class CaseState(str, Enum):
    DRAFT = "draft"
    EVIDENCE_COLLECTION = "evidence_collection"
    UNDER_ANALYSIS = "under_analysis"
    PROPOSAL_READY = "proposal_ready"
    NEGOTIATING = "negotiating"
    ACCEPTED = "accepted"
    ESCALATED = "escalated"
    CLOSED = "closed"
