// ============================================================================
// C++ Smart Pointer & Garbage Collector Visualizer Engine
// ============================================================================

// --- 32-bit Mersenne Twister (MT19937) implementation matching C++ std::mt19937 ---
class MersenneTwister {
  constructor(seed = 1337) {
    this.MT = new Uint32Array(624);
    this.index = 624;
    this.init(seed);
  }

  init(seed) {
    this.MT[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
      const s = this.MT[i - 1] ^ (this.MT[i - 1] >>> 30);
      this.MT[i] =
        (Math.imul(1812433253, s) + i) >>> 0;
    }
    this.index = 624;
  }

  next() {
    if (this.index >= 624) {
      this.twist();
    }

    let y = this.MT[this.index++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
  }

  twist() {
    for (let i = 0; i < 624; i++) {
      const y = (this.MT[i] & 0x80000000) + (this.MT[(i + 1) % 624] & 0x7fffffff);
      let nextVal = this.MT[(i + 397) % 624] ^ (y >>> 1);
      if (y % 2 !== 0) {
        nextVal ^= 0x9908b0df;
      }
      this.MT[i] = nextVal >>> 0;
    }
    this.index = 0;
  }

  range(min, max) {
    return min + (this.next() % (max - min + 1));
  }
}

// --- Application State ---
const state = {
  objects: [],
  rootPointers: [], // IDs of objects currently held by root pointers (std::vector<SmartPointer<Node>>)
  nextId: 1,
  collectionsCount: 0,
  sweptCount: 0,
  cycleLeaksPrevented: 0,
  gcPhase: 'idle', // 'idle' | 'marking' | 'sweeping'
  
  // C++ Simulation State
  simStep: 0,
  totalSimSteps: 30,
  maxActiveNodes: 8,
  rng: new MersenneTwister(1337),
  isRunning: false,
  timerId: null,
  playbackSpeed: 1.0,
  
  // UI Interaction
  selectedNodeId: null,
  activeTab: 'graph',
  logFilter: 'all',
  logs: []
};

// --- DOM References ---
const dom = {
  // Stats
  liveObjectsStat: document.getElementById('liveObjectsStat'),
  heapBytesStat: document.getElementById('heapBytesStat'),
  rootObjectsStat: document.getElementById('rootObjectsStat'),
  cyclesPreventedStat: document.getElementById('cyclesPreventedStat'),
  collectionsStat: document.getElementById('collectionsStat'),
  collectedStat: document.getElementById('collectedStat'),
  phaseBadge: document.getElementById('phaseBadge'),
  simStatusPill: document.getElementById('simStatusPill'),
  stepCounterDisplay: document.getElementById('stepCounterDisplay'),
  
  // Actions
  stepSimBtn: document.getElementById('stepSimBtn'),
  playPauseSimBtn: document.getElementById('playPauseSimBtn'),
  playIcon: document.getElementById('playIcon'),
  playPauseText: document.getElementById('playPauseText'),
  collectBtn: document.getElementById('collectBtn'),
  addObjectBtn: document.getElementById('addObjectBtn'),
  sourceSelect: document.getElementById('sourceSelect'),
  targetSelect: document.getElementById('targetSelect'),
  linkBtn: document.getElementById('linkBtn'),
  unlinkBtn: document.getElementById('unlinkBtn'),
  toggleRootBtn: document.getElementById('toggleRootBtn'),
  deleteNodeBtn: document.getElementById('deleteNodeBtn'),
  reLayoutBtn: document.getElementById('reLayoutBtn'),
  resetSimBtn: document.getElementById('resetSimBtn'),
  speedSlider: document.getElementById('speedSlider'),
  speedValueText: document.getElementById('speedValueText'),
  
  // Canvas & Layers
  canvasContainer: document.getElementById('canvasContainer'),
  svgGraph: document.getElementById('svgGraph'),
  svgEdgeGroup: document.getElementById('svgEdgeGroup'),
  nodesContainer: document.getElementById('nodesContainer'),
  
  // Tabs & Views
  graphTabView: document.getElementById('graphTabView'),
  heapTableTabView: document.getElementById('heapTableTabView'),
  architectureTabView: document.getElementById('architectureTabView'),
  heapTableBody: document.getElementById('heapTableBody'),
  
  // Right Sidebar
  stepActionBadge: document.getElementById('stepActionBadge'),
  stepDescription: document.getElementById('stepDescription'),
  stepCodePreview: document.getElementById('stepCodePreview'),
  inspectorNodeId: document.getElementById('inspectorNodeId'),
  inspectorContent: document.getElementById('inspectorContent'),
  
  // Terminal
  terminalOutput: document.getElementById('terminalOutput'),
  copyLogBtn: document.getElementById('copyLogBtn'),
  clearLogBtn: document.getElementById('clearLogBtn')
};

// --- Helper Functions ---
function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

function generateHexAddress(id) {
  const base = 0x7ffee100;
  const addr = (base + id * 0x48).toString(16).toUpperCase();
  return '0x' + addr;
}

function appendLog(category, tag, message) {
  const entry = {
    id: Date.now() + Math.random(),
    time: getTimestamp(),
    category,
    tag,
    message
  };

  state.logs.unshift(entry);
  if (state.logs.length > 200) {
    state.logs.pop();
  }
  renderTerminal();
}

function renderTerminal() {
  const filtered = state.logs.filter((item) => {
    if (state.logFilter === 'all') return true;
    if (state.logFilter === 'sim') return item.category === 'sim';
    if (state.logFilter === 'gc') return item.category === 'gc';
    return true;
  });

  dom.terminalOutput.innerHTML = filtered
    .map((log) => {
      let tagClass = 'tag-sim';
      if (log.tag.includes('GC') || log.tag.includes('MARK')) tagClass = 'tag-gc';
      if (log.tag.includes('SWEEP') || log.tag.includes('DESTROY')) tagClass = 'tag-sweep';
      if (log.tag.includes('ALLOC')) tagClass = 'tag-alloc';
      if (log.tag.includes('LINK')) tagClass = 'tag-link';

      return `
        <div class="log-line">
          <span class="log-time">${log.time}</span>
          <span class="log-tag ${tagClass}">[${log.tag}]</span>
          <span class="log-msg">${escapeHtml(log.message)}</span>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getNodeById(id) {
  return state.objects.find((obj) => obj.id === Number(id));
}

// Recalculate SmartPointer reference counts
function updateRefCounts() {
  // Reset incoming counts
  state.objects.forEach((obj) => {
    obj.refCount = 0;
  });

  // 1. Root pointers on stack hold a reference
  state.rootPointers.forEach((rootId) => {
    const target = getNodeById(rootId);
    if (target) {
      target.refCount += 1;
    }
  });

  // 2. Outgoing SmartPointer references from heap objects
  state.objects.forEach((obj) => {
    obj.references.forEach((targetId) => {
      const target = getNodeById(targetId);
      if (target) {
        target.refCount += 1;
      }
    });
  });
}

// --- GC Mark and Sweep Implementation ---
function markReachable() {
  // Clear marked flags
  state.objects.forEach((obj) => {
    obj.marked = false;
  });

  const queue = [];
  
  // Enqueue all roots
  state.objects
    .filter((obj) => obj.root)
    .forEach((rootNode) => {
      queue.push(rootNode.id);
    });

  while (queue.length > 0) {
    const currentId = queue.shift();
    const current = getNodeById(currentId);

    if (!current || current.marked) {
      continue;
    }

    current.marked = true;

    current.references.forEach((refId) => {
      const neighbor = getNodeById(refId);
      if (neighbor && !neighbor.marked) {
        queue.push(neighbor.id);
      }
    });
  }
}

function runCollectionCycle(callback) {
  if (state.gcPhase !== 'idle') return;

  state.gcPhase = 'marking';
  updateUIPhase();
  appendLog('gc', 'GC_MARK', 'Starting Garbage Collection: Tracing Root Set...');

  markReachable();
  renderGraph();

  const stepDelay = Math.max(150, 400 / state.playbackSpeed);

  setTimeout(() => {
    state.gcPhase = 'sweeping';
    updateUIPhase();

    // Identify garbage objects
    const garbageNodes = state.objects.filter((obj) => !obj.marked);
    
    // Check if any garbage had refCount > 0 (cyclic reference leak caught!)
    const cycleVictims = garbageNodes.filter((obj) => obj.refCount > 0);
    if (cycleVictims.length > 0) {
      state.cycleLeaksPrevented += cycleVictims.length;
      appendLog(
        'gc',
        'CYCLE_CAUGHT',
        `Mark & Sweep resolved circular leak in ${cycleVictims.length} node(s) (RefCount > 0 but unreachable)!`
      );
    }

    appendLog(
      'gc',
      'GC_SWEEP',
      `Scanning heap: ${garbageNodes.length} unreachable object(s) found for destruction.`
    );

    // Apply sweep styling to DOM
    garbageNodes.forEach((obj) => {
      const el = document.getElementById(`node-${obj.id}`);
      if (el) {
        el.classList.add('dissolving');
      }
    });

    setTimeout(() => {
      // Reclaim objects
      const beforeCount = state.objects.length;
      const collectedCount = garbageNodes.length;
      const surviving = state.objects.filter((obj) => obj.marked);

      // Clean dangling references in survivors
      surviving.forEach((survivor) => {
        survivor.references = survivor.references.filter((refId) =>
          surviving.some((n) => n.id === refId)
        );
      });

      state.objects = surviving;
      state.collectionsCount += 1;
      state.sweptCount += collectedCount;

      updateRefCounts();
      state.gcPhase = 'idle';
      updateUIPhase();

      appendLog(
        'gc',
        'GC_COMPLETE',
        `Sweep complete | Before: ${beforeCount} | Collected: ${collectedCount} | Remaining: ${surviving.length}`
      );

      renderAll();

      if (callback) callback();
    }, stepDelay);
  }, stepDelay);
}

// --- C++ main.cpp Simulation Step Engine ---
function executeCppStep() {
  if (state.simStep >= state.totalSimSteps) {
    // End of simulation cleanup (matches main.cpp lines 132-140)
    appendLog('sim', 'SIM_FINISH', 'Clearing remaining root references...');
    
    state.rootPointers = [];
    state.objects.forEach((obj) => {
      obj.root = false;
    });
    updateRefCounts();
    renderAll();

    appendLog('sim', 'SIM_FINISH', 'Running final GarbageCollector sweep...');
    runCollectionCycle(() => {
      appendLog('sim', 'SIM_FINISH', '=== Simulation Finished ===');
      pauseSimulation();
      dom.simStatusPill.textContent = 'Completed (30/30)';
      dom.simStatusPill.style.color = '#10b981';
      dom.stepActionBadge.textContent = 'Finished';
      dom.stepDescription.textContent = 'Simulation completed. All root pointers destroyed and final sweep executed.';
      dom.stepCodePreview.textContent = '// root_pointers.clear();\n// GarbageCollector::getInstance().collect();';
    });
    return;
  }

  state.simStep += 1;
  dom.stepCounterDisplay.textContent = `Step: ${state.simStep} / ${state.totalSimSteps}`;
  dom.simStatusPill.textContent = `Step ${state.simStep}`;

  const action = state.rng.range(0, 3);

  switch (action) {
    // CASE 0: CREATE NEW NODE
    case 0: {
      dom.stepActionBadge.textContent = 'Case 0: New Node';
      if (state.rootPointers.length < state.maxActiveNodes) {
        const newId = state.simStep;
        const newNode = createNodeObject(newId, `Node #${newId}`);
        newNode.root = true;
        state.rootPointers.push(newId);

        appendLog('sim', 'ALLOC', `[Sim] Created Node #${newId}`);
        dom.stepDescription.textContent = `SmartPointer<Node> newNode(new Node(${newId})); root_pointers.push_back(newNode);`;
        dom.stepCodePreview.textContent = `SmartPointer<Node> newNode(new Node(${newId}));\nroot_pointers.push_back(newNode);`;
      } else {
        dom.stepDescription.textContent = `Max root node limit (${state.maxActiveNodes}) reached. Skipped allocation.`;
        dom.stepCodePreview.textContent = `// root_pointers.size() >= max_active_nodes`;
      }
      updateRefCounts();
      renderAll();
      break;
    }

    // CASE 1: LINK TWO NODES
    case 1: {
      dom.stepActionBadge.textContent = 'Case 1: Link Nodes';
      if (state.rootPointers.length >= 2) {
        const idx1 = state.rng.next() % state.rootPointers.length;
        const idx2 = state.rng.next() % state.rootPointers.length;

        if (idx1 !== idx2) {
          const id1 = state.rootPointers[idx1];
          const id2 = state.rootPointers[idx2];
          const node1 = getNodeById(id1);
          const node2 = getNodeById(id2);

          if (node1 && node2) {
            if (!node1.references.includes(id2)) {
              node1.references.push(id2);
            }
            appendLog('sim', 'LINK', `[Sim] Linked Node ${id1} -> Node ${id2}`);
            dom.stepDescription.textContent = `root_pointers[${idx1}]->next = root_pointers[${idx2}]; (Node ${id1} -> Node ${id2})`;
            dom.stepCodePreview.textContent = `root_pointers[${idx1}]->next = root_pointers[${idx2}];`;
          }
        } else {
          dom.stepDescription.textContent = `Randomly selected identical nodes (${idx1} == ${idx2}). No link created.`;
          dom.stepCodePreview.textContent = `// idx1 == idx2 (skipped)`;
        }
      } else {
        dom.stepDescription.textContent = `Fewer than 2 root pointers active. Cannot link.`;
        dom.stepCodePreview.textContent = `// root_pointers.size() < 2`;
      }
      updateRefCounts();
      renderAll();
      break;
    }

    // CASE 2: REMOVE ROOT POINTER
    case 2: {
      dom.stepActionBadge.textContent = 'Case 2: Drop Root';
      if (state.rootPointers.length > 0) {
        const idx = state.rng.next() % state.rootPointers.length;
        const droppedId = state.rootPointers[idx];
        const droppedNode = getNodeById(droppedId);

        state.rootPointers.splice(idx, 1);
        if (droppedNode) {
          // If no other root pointer holds it, toggle root flag false
          if (!state.rootPointers.includes(droppedId)) {
            droppedNode.root = false;
          }
          appendLog('sim', 'ROOT_DROP', `[Sim] Dropped root reference to Node ${droppedId}`);
        }

        dom.stepDescription.textContent = `Dropped root pointer at index ${idx} (Node ${droppedId}). It may become unreachable garbage!`;
        dom.stepCodePreview.textContent = `root_pointers.erase(root_pointers.begin() + ${idx});`;
      } else {
        dom.stepDescription.textContent = `No active root pointers to drop.`;
        dom.stepCodePreview.textContent = `// root_pointers.empty()`;
      }
      updateRefCounts();
      renderAll();
      break;
    }

    // CASE 3: RUN GARBAGE COLLECTOR
    case 3: {
      dom.stepActionBadge.textContent = 'Case 3: GC Sweep';
      dom.stepDescription.textContent = `GarbageCollector::getInstance().collect(); Running mark and sweep.`;
      dom.stepCodePreview.textContent = `GarbageCollector::getInstance().collect();`;
      appendLog('sim', 'GC_SWEEP', '[Sim] Invoking GarbageCollector sweep...');

      runCollectionCycle();
      break;
    }
  }
}

function startAutoSimulation() {
  if (state.isRunning) return;
  state.isRunning = true;
  dom.playPauseText.textContent = 'Pause';
  dom.playIcon.innerHTML = `<rect x="5" y="4" width="4" height="16"></rect><rect x="15" y="4" width="4" height="16"></rect>`;

  function loop() {
    if (!state.isRunning) return;
    executeCppStep();

    if (state.simStep < state.totalSimSteps) {
      const delay = Math.max(250, 900 / state.playbackSpeed);
      state.timerId = setTimeout(loop, delay);
    } else {
      pauseSimulation();
    }
  }

  loop();
}

function pauseSimulation() {
  state.isRunning = false;
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
  dom.playPauseText.textContent = 'Auto Run';
  dom.playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
}

// --- Object Creation & Management ---
function createNodeObject(id, name = null) {
  const containerW = dom.canvasContainer.clientWidth || 750;
  const containerH = dom.canvasContainer.clientHeight || 480;

  // Position nicely in a flow layout
  const count = state.objects.length;
  const cols = 4;
  const col = count % cols;
  const row = Math.floor(count / cols);

  const posX = Math.min(containerW - 170, 40 + col * 175);
  const posY = Math.min(containerH - 110, 40 + row * 115);

  const obj = {
    id: id,
    name: name || `Node #${id}`,
    type: 'Node',
    addr: generateHexAddress(id),
    x: posX,
    y: posY,
    root: false,
    marked: false,
    refCount: 1,
    references: []
  };

  state.objects.push(obj);
  return obj;
}

// --- Presets ---
function loadPreset(presetName) {
  pauseSimulation();
  state.simStep = 0;
  state.rng = new MersenneTwister(1337);
  state.objects = [];
  state.rootPointers = [];
  state.collectionsCount = 0;
  state.sweptCount = 0;
  state.cycleLeaksPrevented = 0;
  state.selectedNodeId = null;
  dom.stepCounterDisplay.textContent = 'Step: 0 / 30';
  dom.simStatusPill.textContent = 'Ready';
  dom.simStatusPill.style.color = '#38bdf8';

  if (presetName === 'cpp-main') {
    appendLog('sim', 'INIT', '=== Starting Garbage Collector Simulation (30 Steps) ===');
    dom.stepActionBadge.textContent = 'Ready';
    dom.stepDescription.textContent = 'Loaded C++ main.cpp simulation scenario with 30 pseudo-random steps (seed: 1337).';
    dom.stepCodePreview.textContent = `runGarbageCollectorSimulation(30, 8);`;
  } else if (presetName === 'cyclic-leak') {
    // Classic cycle: Node A points to Node B, Node B points to Node A.
    // Node A initially held by root, then root is dropped!
    const nodeA = createNodeObject(1, 'Node A');
    const nodeB = createNodeObject(2, 'Node B');
    const nodeC = createNodeObject(3, 'Node C');

    nodeA.x = 80;
    nodeA.y = 100;
    nodeB.x = 300;
    nodeB.y = 100;
    nodeC.x = 190;
    nodeC.y = 260;

    // A -> B, B -> A (Cycle!)
    nodeA.references = [2];
    nodeB.references = [1];
    
    // Node C is independent root
    nodeC.root = true;
    state.rootPointers = [3];

    // Node A & B have NO root, but reference each other!
    // SmartPointer referenceCount for both is 1!
    appendLog(
      'sim',
      'SCENARIO',
      'Cyclic Reference Scenario: Node A <-> Node B cycle. No root points to them, yet RefCount=1 on both! Standard shared_ptr leaks, but GC will sweep them.'
    );
    dom.stepActionBadge.textContent = 'Cycle Leak';
    dom.stepDescription.textContent = 'Notice Node A and B have RefCount: 1 because they point to each other, but STACK ROOT is FALSE. They are isolated circular garbage!';
    dom.stepCodePreview.textContent = `// A->next = B; B->next = A;\n// rootA.reset(); rootB.reset();\n// RefCount > 0, yet unreachable!`;
  } else if (presetName === 'linked-list') {
    // Doubly linked chain: 1 <-> 2 <-> 3 <-> 4
    const n1 = createNodeObject(1, 'Head');
    const n2 = createNodeObject(2, 'Node 2');
    const n3 = createNodeObject(3, 'Node 3');
    const n4 = createNodeObject(4, 'Tail');

    n1.x = 60;  n1.y = 140; n1.root = true;
    n2.x = 240; n2.y = 140;
    n3.x = 420; n3.y = 140;
    n4.x = 600; n4.y = 140;

    n1.references = [2];
    n2.references = [1, 3];
    n3.references = [2, 4];
    n4.references = [3];

    state.rootPointers = [1];
    appendLog('sim', 'SCENARIO', 'Loaded Doubly Linked Chain starting at Head (Root).');
    dom.stepActionBadge.textContent = 'Linked List';
    dom.stepDescription.textContent = 'Doubly linked list where each node has forward and backward SmartPointers.';
    dom.stepCodePreview.textContent = `Head->next = Node2; Node2->prev = Head; ...`;
  } else if (presetName === 'island-isolation') {
    // Root points to N1 -> N2
    // N3, N4, N5 form an isolated mesh
    const n1 = createNodeObject(1, 'Root N1');
    const n2 = createNodeObject(2, 'Live N2');
    const n3 = createNodeObject(3, 'Island A');
    const n4 = createNodeObject(4, 'Island B');
    const n5 = createNodeObject(5, 'Island C');

    n1.x = 70;  n1.y = 80; n1.root = true;
    n2.x = 230; n2.y = 80;
    n3.x = 100; n3.y = 260;
    n4.x = 280; n4.y = 260;
    n5.x = 460; n5.y = 260;

    n1.references = [2];
    n3.references = [4];
    n4.references = [5];
    n5.references = [3]; // Circular island

    state.rootPointers = [1];
    appendLog('sim', 'SCENARIO', 'Loaded Island of Isolation: Ring 3->4->5 is completely disconnected from Root.');
    dom.stepActionBadge.textContent = 'Island';
    dom.stepDescription.textContent = 'The island {3, 4, 5} has circular dependencies but no root pointer. Mark & sweep sweeps all three!';
    dom.stepCodePreview.textContent = `// Subgraph {3, 4, 5} unreachable from root_pointers`;
  } else if (presetName === 'binary-tree') {
    const root = createNodeObject(1, 'Tree Root');
    const left = createNodeObject(2, 'Left Child');
    const right = createNodeObject(3, 'Right Child');
    const l1 = createNodeObject(4, 'Leaf 1');
    const l2 = createNodeObject(5, 'Leaf 2');

    root.x = 280;  root.y = 40; root.root = true;
    left.x = 140;  left.y = 160;
    right.x = 420; right.y = 160;
    l1.x = 70;    l1.y = 290;
    l2.x = 210;   l2.y = 290;

    root.references = [2, 3];
    left.references = [4, 5];

    state.rootPointers = [1];
    appendLog('sim', 'SCENARIO', 'Loaded Binary Tree rooted at Tree Root.');
    dom.stepActionBadge.textContent = 'Tree';
    dom.stepDescription.textContent = 'Hierarchical tree structure. Toggling root off Tree Root turns the entire subtree into garbage.';
    dom.stepCodePreview.textContent = `root->left = leftChild; root->right = rightChild;`;
  }

  updateRefCounts();
  renderAll();
}

// --- Layout & Drawing Engine ---
function renderGraph() {
  const container = dom.nodesContainer;
  const svgGroup = dom.svgEdgeGroup;

  container.innerHTML = '';
  svgGroup.innerHTML = '';

  const cardW = 154;
  const cardH = 88;

  // 1. Render SVG Directed Edges
  state.objects.forEach((source) => {
    source.references.forEach((targetId) => {
      const target = getNodeById(targetId);
      if (!target) return;

      const isBiDirectional = target.references.includes(source.id);
      const isSelf = source.id === target.id;

      const sX = source.x + cardW / 2;
      const sY = source.y + cardH / 2;
      const tX = target.x + cardW / 2;
      const tY = target.y + cardH / 2;

      let pathD = '';

      if (isSelf) {
        // Self-loop arc above the card
        const topX = source.x + cardW / 2;
        const topY = source.y;
        pathD = `M ${topX - 25} ${topY} C ${topX - 45} ${topY - 45}, ${topX + 45} ${topY - 45}, ${topX + 25} ${topY}`;
      } else {
        // Calculate edge clipping for clean arrowhead termination
        const dx = tX - sX;
        const dy = tY - sY;
        const angle = Math.atan2(dy, dx);

        // Adjust target end point to touch card boundary
        const offsetX = Math.cos(angle) * (cardW / 2 + 6);
        const offsetY = Math.sin(angle) * (cardH / 2 + 6);

        const endX = tX - offsetX;
        const endY = tY - offsetY;

        if (isBiDirectional) {
          // Curved arc for bidirectional pointers to avoid line collision
          const midX = (sX + endX) / 2;
          const midY = (sY + endY) / 2;
          const perpX = -Math.sin(angle) * 22;
          const perpY = Math.cos(angle) * 22;
          pathD = `M ${sX} ${sY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`;
        } else {
          pathD = `M ${sX} ${sY} L ${endX} ${endY}`;
        }
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);

      let edgeClass = 'edge-line';
      let markerId = 'url(#arrow)';

      if (state.gcPhase === 'marking') {
        if (source.marked && target.marked) {
          edgeClass += ' active';
          markerId = 'url(#arrow-active)';
        }
      } else if (state.gcPhase === 'sweeping') {
        if (!source.marked || !target.marked) {
          edgeClass += ' garbage';
          markerId = 'url(#arrow-garbage)';
        }
      }

      path.setAttribute('class', edgeClass);
      path.setAttribute('marker-end', markerId);
      svgGroup.appendChild(path);
    });
  });

  // 2. Render Node Cards
  state.objects.forEach((obj) => {
    const card = document.createElement('div');
    card.id = `node-${obj.id}`;
    card.className = 'node-card';
    card.style.left = `${obj.x}px`;
    card.style.top = `${obj.y}px`;

    if (obj.root) card.classList.add('is-root');
    if (obj.id === state.selectedNodeId) card.classList.add('selected');

    if (state.gcPhase === 'marking') {
      if (obj.marked) card.classList.add('is-marked');
    } else if (state.gcPhase === 'sweeping') {
      if (obj.marked) {
        card.classList.add('is-marked');
      } else {
        card.classList.add('is-garbage');
      }
    }

    // Cycle Risk Badge: RefCount > 0 but NOT Root
    const hasCycleRisk = !obj.root && obj.refCount > 0 && !obj.marked && state.gcPhase !== 'idle';
    const rcBadgeClass = hasCycleRisk ? 'node-rc-badge cycle-risk' : 'node-rc-badge';

    let statusText = 'Idle';
    let statusClass = 'status-idle';
    if (obj.marked) {
      statusText = '● Reachable';
      statusClass = 'status-reachable';
    } else if (state.gcPhase !== 'idle' && !obj.marked) {
      statusText = '✕ Unreachable (Garbage)';
      statusClass = 'status-unreachable';
    }

    card.innerHTML = `
      <div class="node-header">
        <span class="node-id">${escapeHtml(obj.name)}</span>
        <span class="${rcBadgeClass}" title="ControlBlock reference count">RC: ${obj.refCount}</span>
      </div>
      <div class="node-body">
        <span class="node-addr">${obj.addr}</span>
        <span class="node-status ${statusClass}">${statusText}</span>
      </div>
    `;

    // Drag and selection handlers
    setupNodeDrag(card, obj);
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(obj.id);
    });

    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      toggleNodeRoot(obj.id);
    });

    container.appendChild(card);
  });
}

// --- Drag and Drop for Nodes ---
function setupNodeDrag(cardEl, nodeObj) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - nodeObj.x;
    startY = e.clientY - nodeObj.y;
    cardEl.setPointerCapture(e.pointerId);
    cardEl.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const containerW = dom.canvasContainer.clientWidth;
    const containerH = dom.canvasContainer.clientHeight;

    const newX = Math.max(10, Math.min(containerW - 165, e.clientX - startX));
    const newY = Math.max(10, Math.min(containerH - 100, e.clientY - startY));

    nodeObj.x = newX;
    nodeObj.y = newY;

    cardEl.style.left = `${newX}px`;
    cardEl.style.top = `${newY}px`;

    // Re-render SVG edges during drag for live feedback
    renderGraph();
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    cardEl.style.transition = '';
    cardEl.releasePointerCapture(e.pointerId);
    renderGraph();
  }

  cardEl.addEventListener('pointerdown', onPointerDown);
  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerup', onPointerUp);
  cardEl.addEventListener('pointercancel', onPointerUp);
}

// --- Node Selection & Inspector ---
function selectNode(id) {
  state.selectedNodeId = id;
  dom.sourceSelect.value = String(id);

  const node = getNodeById(id);
  if (!node) {
    dom.inspectorNodeId.textContent = 'None';
    dom.inspectorContent.innerHTML = `<div class="empty-state">Select any node on the canvas to inspect.</div>`;
    return;
  }

  dom.inspectorNodeId.textContent = node.name;
  dom.inspectorContent.innerHTML = `
    <div class="inspector-prop">
      <span class="prop-label">Virtual Address</span>
      <span class="prop-val">${node.addr}</span>
    </div>
    <div class="inspector-prop">
      <span class="prop-label">Type</span>
      <span class="prop-val">${node.type}</span>
    </div>
    <div class="inspector-prop">
      <span class="prop-label">Root (Stack Reference)</span>
      <span class="prop-val" style="color: ${node.root ? '#f59e0b' : '#94a3b8'}">${node.root ? 'YES (Active)' : 'NO'}</span>
    </div>
    <div class="inspector-prop">
      <span class="prop-label">ControlBlock RefCount</span>
      <span class="prop-val">${node.refCount}</span>
    </div>
    <div class="inspector-prop">
      <span class="prop-label">GC Mark Status</span>
      <span class="prop-val" style="color: ${node.marked ? '#38bdf8' : '#f43f5e'}">${node.marked ? 'MARKED' : 'UNMARKED'}</span>
    </div>
    <div class="inspector-prop">
      <span class="prop-label">Outgoing References</span>
      <span class="prop-val">${node.references.length > 0 ? node.references.map(r => `Node #${r}`).join(', ') : 'None'}</span>
    </div>
  `;

  renderGraph();
}

function toggleNodeRoot(id) {
  const node = getNodeById(id);
  if (!node) return;

  node.root = !node.root;
  if (node.root) {
    if (!state.rootPointers.includes(node.id)) {
      state.rootPointers.push(node.id);
    }
    appendLog('sim', 'ROOT', `Added stack root pointer to ${node.name}`);
  } else {
    state.rootPointers = state.rootPointers.filter(rId => rId !== node.id);
    appendLog('sim', 'ROOT', `Removed stack root pointer from ${node.name}`);
  }

  updateRefCounts();
  renderAll();
  selectNode(id);
}

// --- Auto Layout ---
function autoLayoutNodes() {
  const containerW = dom.canvasContainer.clientWidth || 750;
  const containerH = dom.canvasContainer.clientHeight || 480;
  const total = state.objects.length;

  if (total === 0) return;

  const cols = Math.min(4, Math.ceil(Math.sqrt(total * 1.5)));
  const cellW = (containerW - 80) / cols;
  const cellH = 110;

  state.objects.forEach((obj, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    obj.x = 40 + col * cellW;
    obj.y = 40 + row * cellH;
  });

  renderGraph();
  appendLog('sim', 'LAYOUT', 'Rearranged node graph.');
}

// --- Render Table & Metrics ---
function updateStats() {
  const liveCount = state.objects.length;
  const rootCount = state.objects.filter((obj) => obj.root).length;
  const estimatedBytes = liveCount * 48; // ~48 bytes per GCObject + ControlBlock

  dom.liveObjectsStat.textContent = String(liveCount);
  dom.heapBytesStat.textContent = `${estimatedBytes} B`;
  dom.rootObjectsStat.textContent = String(rootCount);
  dom.cyclesPreventedStat.textContent = String(state.cycleLeaksPrevented);
  dom.collectionsStat.textContent = String(state.collectionsCount);
  dom.collectedStat.textContent = String(state.sweptCount);
}

function updateUIPhase() {
  dom.phaseBadge.textContent = state.gcPhase;
  dom.phaseBadge.className = `phase-badge ${state.gcPhase}`;
}

function renderHeapTable() {
  dom.heapTableBody.innerHTML = state.objects
    .map((obj) => {
      const outLinks = obj.references.length > 0 ? obj.references.map(r => `Node #${r}`).join(', ') : '—';
      const rootPill = obj.root
        ? '<span style="color: #f59e0b; font-weight:700;">ROOT</span>'
        : '<span style="color: #64748b;">Heap Only</span>';
      const markPill = obj.marked
        ? '<span style="color: #38bdf8; font-weight:700;">MARKED</span>'
        : '<span style="color: #f43f5e;">UNMARKED</span>';

      return `
        <tr>
          <td>${obj.addr}</td>
          <td><strong>${escapeHtml(obj.name)}</strong></td>
          <td>${obj.type}</td>
          <td>${obj.refCount}</td>
          <td>${rootPill}</td>
          <td>${markPill}</td>
          <td>${outLinks}</td>
          <td>${obj.marked ? 'Reachable' : 'Candidate'}</td>
        </tr>
      `;
    })
    .join('');
}

function updateSelectDropdowns() {
  const currentSource = dom.sourceSelect.value;
  const currentTarget = dom.targetSelect.value;

  const options = state.objects
    .map((obj) => `<option value="${obj.id}">${escapeHtml(obj.name)} (${obj.addr})</option>`)
    .join('');

  dom.sourceSelect.innerHTML = options;
  dom.targetSelect.innerHTML = options;

  if (state.objects.length > 0) {
    if (getNodeById(currentSource)) dom.sourceSelect.value = currentSource;
    if (getNodeById(currentTarget)) dom.targetSelect.value = currentTarget;
  }
}

function renderAll() {
  updateRefCounts();
  updateStats();
  updateUIPhase();
  updateSelectDropdowns();
  renderGraph();
  renderHeapTable();
  if (state.selectedNodeId) {
    selectNode(state.selectedNodeId);
  }
}

// --- Manual Link / Sever / Actions ---
function linkSelected() {
  const sId = Number(dom.sourceSelect.value);
  const tId = Number(dom.targetSelect.value);

  if (!sId || !tId) return;
  const source = getNodeById(sId);
  const target = getNodeById(tId);

  if (!source || !target) return;

  if (!source.references.includes(tId)) {
    source.references.push(tId);
    appendLog('sim', 'LINK', `Linked ${source.name} -> ${target.name}`);
  } else {
    appendLog('sim', 'LINK', `${source.name} already points to ${target.name}`);
  }

  updateRefCounts();
  renderAll();
}

function unlinkSelected() {
  const sId = Number(dom.sourceSelect.value);
  const tId = Number(dom.targetSelect.value);

  if (!sId || !tId) return;
  const source = getNodeById(sId);
  if (!source) return;

  source.references = source.references.filter((id) => id !== tId);
  appendLog('sim', 'SEVER', `Severed pointer from ${source.name} to Node #${tId}`);

  updateRefCounts();
  renderAll();
}

function manualAddNode() {
  const newId = state.nextId++;
  const node = createNodeObject(newId, `Obj ${newId}`);
  appendLog('sim', 'ALLOC', `Allocated new ${node.type} at ${node.addr}`);
  renderAll();
  selectNode(newId);
}

function deleteSelectedNode() {
  const sId = Number(dom.sourceSelect.value);
  if (!sId) return;

  state.objects = state.objects.filter((obj) => obj.id !== sId);
  state.rootPointers = state.rootPointers.filter((id) => id !== sId);

  // Remove references pointing to this node
  state.objects.forEach((obj) => {
    obj.references = obj.references.filter((id) => id !== sId);
  });

  appendLog('sim', 'DELETE', `Manual deallocation of Node #${sId}`);
  state.selectedNodeId = null;
  renderAll();
}

// --- Event Listeners Setup ---
function setupEvents() {
  // Top nav controls
  dom.stepSimBtn.addEventListener('click', () => {
    pauseSimulation();
    executeCppStep();
  });

  dom.playPauseSimBtn.addEventListener('click', () => {
    if (state.isRunning) {
      pauseSimulation();
    } else {
      startAutoSimulation();
    }
  });

  dom.collectBtn.addEventListener('click', () => {
    runCollectionCycle();
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      loadPreset(preset);
    });
  });

  // Manual actions
  dom.addObjectBtn.addEventListener('click', manualAddNode);
  dom.linkBtn.addEventListener('click', linkSelected);
  dom.unlinkBtn.addEventListener('click', unlinkSelected);
  dom.toggleRootBtn.addEventListener('click', () => {
    const sId = Number(dom.sourceSelect.value);
    if (sId) toggleNodeRoot(sId);
  });
  dom.deleteNodeBtn.addEventListener('click', deleteSelectedNode);
  dom.reLayoutBtn.addEventListener('click', autoLayoutNodes);
  dom.resetSimBtn.addEventListener('click', () => {
    loadPreset('cpp-main');
  });

  // Speed slider
  dom.speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.playbackSpeed = val;
    dom.speedValueText.textContent = `${val.toFixed(1)}x`;
  });

  // Tabs
  document.querySelectorAll('.canvas-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.canvas-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'));

      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');

      if (targetTab === 'graph') {
        dom.graphTabView.classList.add('active');
        renderGraph();
      } else if (targetTab === 'heap-table') {
        dom.heapTableTabView.classList.add('active');
        renderHeapTable();
      } else if (targetTab === 'architecture') {
        dom.architectureTabView.classList.add('active');
      }
    });
  });

  // Terminal actions
  document.querySelectorAll('.log-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.log-filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.logFilter = btn.getAttribute('data-filter');
      renderTerminal();
    });
  });

  dom.clearLogBtn.addEventListener('click', () => {
    state.logs = [];
    renderTerminal();
  });

  dom.copyLogBtn.addEventListener('click', () => {
    const text = state.logs
      .map((l) => `${l.time} [${l.tag}] ${l.message}`)
      .reverse()
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const orig = dom.copyLogBtn.textContent;
      dom.copyLogBtn.textContent = '✓ Copied';
      setTimeout(() => (dom.copyLogBtn.textContent = orig), 1500);
    });
  });

  // Canvas background click clears selection
  dom.canvasContainer.addEventListener('click', () => {
    state.selectedNodeId = null;
    selectNode(null);
  });

  // Resize window keeps SVG in sync
  window.addEventListener('resize', () => {
    renderGraph();
  });
}

// --- Initialization ---
setupEvents();
loadPreset('cpp-main');
