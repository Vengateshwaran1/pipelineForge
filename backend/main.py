from collections import defaultdict, deque
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# The frontend dev server (http://localhost:3000) is a different origin from
# this API (http://localhost:8000), so CORS must be opened or the browser
# blocks the POST. Origins are listed explicitly — a "*" wildcard combined
# with allow_credentials is rejected by browsers per the CORS spec.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────
# Nodes/edges carry many frontend-only fields (position, data, ...).
# Pydantic ignores extras by default, so we only declare what we use.
class Node(BaseModel):
    id: str


class Edge(BaseModel):
    source: str
    target: str


class Pipeline(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


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


@app.get('/')
def read_root():
    return {'Ping': 'Pong'}


@app.post('/pipelines/parse')
def parse_pipeline(pipeline: Pipeline):
    return {
        'num_nodes': len(pipeline.nodes),
        'num_edges': len(pipeline.edges),
        'is_dag': is_dag(pipeline.nodes, pipeline.edges),
    }
