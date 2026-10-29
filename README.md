# Custom Smart Pointers & Garbage Collector (C++)

A lightweight C++ memory management system implementing custom smart pointers and an automatic garbage collection framework.

## Features
- **Smart Pointer Management:** Automatic reference counting using standard C++ RAII principles.
- **Garbage Collector Engine:** Mark-and-sweep management for dynamically allocated `GCObject` instances.
- **Runtime Simulation:** Built-in simulation in `main.cpp` demonstrating node allocation, reference linking, and garbage collection sweeps.
- **Automated Testing:** Unit test suite verifying collector behavior and edge cases.
- **Interactive Visualizer:** Browser-based graphical interface simulating heap objects, pointer references, mark-and-sweep collection cycles, and cyclic leak resolution.

## Project Structure
- `include/` — Header declarations (`SmartPointer.h`, `GCObject.h`, `GarbageCollector.h`, `ControlBlock.h`).
- `src/` — Memory management implementation files.
- `main.cpp` — Runtime simulation driver.
- `tests/` — Unit tests (`test_gc.cpp`).
- `data/` — Output logs (`gc_log.txt`).
- `index.html` — Interactive frontend simulation interface.
- `style.css` — Modern developer UI styling with dark theme, neon accents, and responsive layout.
- `script.js` — Simulation engine, MT19937 PRNG, interactive SVG pointer graph, and GC mark-sweep runner.

## Interactive Frontend Visualizer
The project includes a standalone web visualizer simulating the C++ runtime, Mark-and-Sweep garbage collection, and RAII smart pointers:
1. Open [`index.html`](index.html) directly in any web browser (Chrome, Edge, Firefox).
2. Features:
   - **C++ Simulation Playback:** Step-by-step or auto-run replay of `main.cpp` (Case 0: new Node, Case 1: link pointers, Case 2: drop root, Case 3: GC sweep) with seed matching the C++ PRNG (`1337`).
   - **Interactive Graph Canvas:** Draggable node cards, directed SVG pointer arrows with arrowhead markers, self-referencing loops, and collision avoidance.
   - **Memory Heap Inspector:** Tabular view of virtual addresses, `ControlBlock` reference counts, root statuses, and GC mark bits.
   - **Preset Scenarios:** Test Circular Reference traps (where ref count $\ge 1$ but GC collects the cycle), Doubly Linked Chains, Islands of Isolation, and Binary Trees.
   - **Real-Time Terminal Console:** Filterable execution log with syntax-colored tags matching C++ console output.

## How to Build and Run

### Prerequisites
- C++17 compliant compiler (`g++` or `MSVC`)
- CMake (version 3.10 or higher)

### Build Steps
```bash
mkdir build
cd build
cmake ..
cmake --build .
```
