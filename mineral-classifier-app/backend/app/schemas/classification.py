"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List


class MineralInfo(BaseModel):
    """Information about a classified mineral."""

    class_name: str = Field(..., alias="class")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    chemical_formula: str = Field(default="", description="Chemical formula")
    hardness: str = Field(default="", description="Hardness (Mohs scale)")
    color: str = Field(default="", description="Color varieties")
    luster: str = Field(default="", description="Surface shine")
    crystal_system: str = Field(default="", description="Crystal system")
    density: str = Field(default="", description="Density in g/cm³")
    streak: str = Field(default="", description="Color of mineral powder")
    cleavage: str = Field(default="", description="Cleavage pattern")
    formation: List[str] = Field(default_factory=list, description="Formation processes")
    occurrence: List[str] = Field(
        default_factory=list, description="Where found geographically"
    )
    uses: List[str] = Field(
        default_factory=list, description="Industrial and practical uses"
    )
    description: str = Field(default="", description="Detailed mineral description")

    model_config = {"populate_by_name": True}


class AlternativeMatch(BaseModel):
    """Alternative mineral classification match."""

    class_name: str = Field(..., alias="class")
    confidence: float = Field(..., ge=0, le=1)

    model_config = {"populate_by_name": True}


class ClassificationResponse(BaseModel):
    """Complete classification response."""

    primary: MineralInfo = Field(..., description="Primary classification result")
    alternatives: List[AlternativeMatch] = Field(
        default_factory=list, description="Top 5 alternatives"
    )
    inference_time_ms: int = Field(
        ..., description="Time taken for inference in milliseconds"
    )

    model_config = {"populate_by_name": True}
