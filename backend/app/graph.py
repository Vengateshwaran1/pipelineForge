"""Pure graph logic — no framework, no I/O, trivially unit-testable."""

from collections import defaultdict, deque
from typing import List

from app.schemas import Edge, Node


def is_dag(nodes: List[Node], edges: List[Edge]) -> bool:
    """Kahn's algorithm: a graph is acyclic iff a topological sort visits
    every node. Any node left with a non-zero in-degree sits on a cycle."""
    node_ids = {n.id for n in nodes}
    adjacency = defaultdict(list)
    indegree = {nid: 0 for nid in node_ids}

    for edge in edges:
        # Ignore edges pointing at nodes that don't exist.
        if edge.source in node_ids and edge.target in node_ids:
            adjacency[edge.source].append(edge.target)
            indegree[edge.target] += 1

    queue = deque(nid for nid in node_ids if indegree[nid] == 0)
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in adjacency[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)

    return visited == len(node_ids)
