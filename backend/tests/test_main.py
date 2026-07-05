"""Tests for the /pipelines/parse endpoint and the DAG check.

Run:  cd backend && pytest
"""

from fastapi.testclient import TestClient

from app.main import app
from app.graph import is_dag
from app.schemas import Node, Edge

client = TestClient(app)


def _nodes(*ids):
    return [Node(id=i) for i in ids]


def _edges(*pairs):
    return [Edge(source=s, target=t) for s, t in pairs]


# ── Pure DAG logic ────────────────────────────────────────────
def test_is_dag_linear_chain():
    assert is_dag(_nodes("a", "b", "c"), _edges(("a", "b"), ("b", "c"))) is True


def test_is_dag_diamond_is_acyclic():
    assert is_dag(
        _nodes("a", "b", "c", "d"),
        _edges(("a", "b"), ("a", "c"), ("b", "d"), ("c", "d")),
    ) is True


def test_is_dag_simple_cycle():
    assert is_dag(_nodes("a", "b"), _edges(("a", "b"), ("b", "a"))) is False


def test_is_dag_self_loop():
    assert is_dag(_nodes("a"), _edges(("a", "a"))) is False


def test_is_dag_empty_graph():
    assert is_dag([], []) is True


def test_is_dag_disconnected_nodes():
    assert is_dag(_nodes("a", "b", "c"), _edges(("a", "b"))) is True


# ── Endpoint ──────────────────────────────────────────────────
def test_parse_endpoint_counts_and_dag():
    payload = {
        "nodes": [
            # Extra frontend-only fields must be ignored by the model.
            {"id": "a", "type": "text", "position": {"x": 0, "y": 0}, "data": {"id": "a"}},
            {"id": "b"},
            {"id": "c"},
        ],
        "edges": [
            {"source": "a", "target": "b", "id": "e1", "sourceHandle": "a-output"},
            {"source": "b", "target": "c"},
        ],
    }
    res = client.post("/pipelines/parse", json=payload)
    assert res.status_code == 200
    assert res.json() == {"num_nodes": 3, "num_edges": 2, "is_dag": True}


def test_parse_endpoint_detects_cycle():
    payload = {
        "nodes": [{"id": "a"}, {"id": "b"}],
        "edges": [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}],
    }
    res = client.post("/pipelines/parse", json=payload)
    assert res.json() == {"num_nodes": 2, "num_edges": 2, "is_dag": False}


def test_parse_endpoint_empty_pipeline():
    res = client.post("/pipelines/parse", json={"nodes": [], "edges": []})
    assert res.json() == {"num_nodes": 0, "num_edges": 0, "is_dag": True}


def test_root_ping():
    assert client.get("/").json() == {"Ping": "Pong"}
