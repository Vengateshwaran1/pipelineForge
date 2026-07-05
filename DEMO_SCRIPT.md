# Recording Narration — say it like this

Just read the **plain lines** aloud, naturally. The _(italic)_ bits are what to do
on screen — don't say those. Pause where you see "…". Aim for ~5 minutes, relaxed.

---

_(canvas open, empty)_

Hey, I'm Vengateshwaran. Thanks for taking a look at this. So what I built is a
visual pipeline builder — you drag nodes onto the canvas, connect them together, and
then send the whole graph to a Python backend to analyze it. Let me just show you how
it works, and then I'll go through the code a bit.

_(pan around, hover the toolbar / dock)_

First thing — the design. I went with a clean dark theme. Every node type has its own
accent color, the icons are all from one consistent set, and there's a bit of motion
throughout so it feels alive rather than static. Watch when I drag a node out…

_(drag one node onto canvas)_

…you get this little entrance animation. Small thing, but it makes the whole thing
feel a lot more polished.

_(drag out several different node types)_

Okay, so this is the part I'm actually most happy with. There are nine node types
here — input, output, LLM, text, and then five more I added: an API request node, a
condition node, a timer, a data transform, and a note. And the thing is… they all
run through the exact same underlying component. I'm not copy-pasting a node file
every time I want a new one.

Instead, each node is just a little config object — you tell it the title, the icon,
what fields it has, and where its handles go. That's it. So if I wanted a tenth node,
it's one small file and one line in a registry. Nothing else in the app has to change.
That was really the core of the first task — making new nodes cheap to create and
easy to restyle everywhere at once.

_(wire two nodes together)_

And connecting them just works like you'd expect — drag from one handle to another.

_(drop a Text node)_

Now let me show you the text node, because it's got some special behavior. I'll start
typing…

_(type a sentence, keep going past the edge)_

…see how the node grows as I type? The width follows the longest line and the height
grows with the text, so you never lose sight of what you're writing.

But here's the fun part. If I type a variable inside double curly braces — like this…

_(type `{{ userName }}`)_

…a new input handle just appeared on the left, labeled "userName." It's reading what I
type and creating handles on the fly. Let me add another one…

_(type `{{ context }}`)_

…and there's the second one. And if I delete a variable…

_(delete one of them)_

…the handle disappears, and if anything was connected to it, that connection gets
cleaned up too. It only does this for actual valid variable names — reserved words
and duplicates get ignored.

_(build a small clean pipeline, 3–4 nodes wired with no loop)_

Alright, last piece — the backend. Let me wire up a quick pipeline here… and now I'll
hit submit.

_(click Submit, confirm the dialog)_

It asks me to confirm, and then it sends all the nodes and edges to a FastAPI endpoint.

_(result modal appears)_

And there's the response. It tells me how many nodes, how many edges, and whether the
pipeline is a valid DAG — a directed acyclic graph. This one is, so I get the little
celebration. The backend is actually running a real topological sort to check that.

Now let me break it on purpose…

_(connect an output back into an earlier node to form a cycle, submit again)_

…I'll create a loop here, submit again — and now it correctly tells me this isn't a
DAG, because there's a cycle. And it even nudges you on how to fix it.

---

## Code walkthrough

_(open the file tree first — show the src/ folders)_

Before the files — quick look at how it's laid out, because I put some thought here.
Everything's grouped by responsibility. `app` is the shell, `canvas` is the flow
surface, `nodes` is the node system, `components` are the reusable widgets, `store`
is state, and `lib` is pure logic with no framework in it. The rule I kept is that the
dependencies only point one way — the UI leans on the store, the store leans on the
pure logic, and never the other way around. So anything is easy to find and easy to
test.

_(open nodes/BaseNode.js)_

This is the shared node component — the one every node runs through. It takes that
config I mentioned, renders the header and the fields, and maps out the handles. The
handles can be a fixed list, or a function — which is exactly how the text node does
its live variables.

_(open nodes/textNode.js)_

And here's the text node itself. Notice it's just configuration — no custom component.
This function grows the width, and this one pulls the variables out of the text with a
regex, throws away reserved words, dedupes them, and returns a handle for each. That's
the whole feature, declaratively.

_(open store/store.js briefly — scroll to useNodeState or the store)_

One thing on state — there's a single source of truth. All the field values live in
one store, and each node just reads its slice and writes back to it. So there's no
local copy sitting next to the store that could drift out of sync. That's also what
lets the text node's handles react to what you type — the value goes into the store,
and the handles are derived straight off it.

_(open backend/app/main.py)_

And the backend — I split it the same way as the frontend. `main.py` is thin: it's
just FastAPI, the CORS setup for the dev server, and the two routes. The actual DAG
logic lives in its own `graph.py` with no framework around it, and the request models
are in `schemas.py`.

_(open backend/app/graph.py)_

This is the DAG check. It's Kahn's algorithm: if you can topologically sort every
node, there's no cycle. Because it's pure, I can unit-test it directly.

_(optional: run `pytest` in backend)_

And I've got tests for that logic and the endpoint — all green.

_(back to the canvas)_

So yeah — that's it. One abstraction behind all the nodes, the live variable handles
in the text node, a single source of truth for state, a design I'm pretty happy with,
and a backend that actually checks whether your pipeline makes sense. Thanks a lot for
watching, and I'm looking forward to the next round.
