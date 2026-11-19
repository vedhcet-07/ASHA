from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseAIProvider(ABC):
    @abstractmethod
    def generate_production_plan(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def explain_allocation(self, allocation_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def draft_rework_note(self, task_name: str, member_name: str, reason: str) -> str:
        pass
