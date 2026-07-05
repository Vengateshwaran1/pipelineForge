"""Request/response models for the pipeline API.

Nodes/edges carry many frontend-only fields (position, data, ...).
Pydantic ignores extras by default, so we only declare what we use.
"""

from typing import List

from pydantic import BaseModel


class Node(BaseModel):
    id: str


class Edge(BaseModel):
    source: str
    target: str


class Pipeline(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
