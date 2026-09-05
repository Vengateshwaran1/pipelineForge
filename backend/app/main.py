"""FastAPI application: CORS, wiring, and the pipeline routes.

Business logic lives in `app.graph`; request models in `app.schemas`.
This module stays thin — app setup and endpoints only.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.graph import is_dag
from app.schemas import Pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://pipeline-forge-two.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
