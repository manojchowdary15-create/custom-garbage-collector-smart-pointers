# Custom Smart Pointers & Garbage Collector (C++)

A lightweight C++ memory management system implementing custom smart pointers and an automatic garbage collection framework.

## Features
- **Smart Pointer Management:** Automatic reference counting using standard C++ RAII principles.
- **Garbage Collector Engine:** Mark-and-sweep management for dynamically allocated `GCObject` instances.
- **Runtime Simulation:** Built-in simulation in `main.cpp` demonstrating node allocation, reference linking, and garbage collection sweeps.
- **Automated Testing:** Unit test suite verifying collector behavior and edge cases.

## Project Structure
- `include/` — Header declarations (`SmartPointer.h`, `GCObject.h`, `GarbageCollector.h`, `ControlBlock.h`).
- `src/` — Memory management implementation files.
- `main.cpp` — Runtime simulation driver.
- `tests/` — Unit tests (`test_gc.cpp`).
- `data/` — Output logs (`gc_log.txt`).

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