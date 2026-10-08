# Custom Garbage Collector & Smart Pointers

## About the Project

This is a C++ mini project based on **Object-Oriented Programming (OOP)**. The main idea of the project is to create a simple garbage collector that can keep track of dynamically created objects and remove the objects that are no longer being used.

Normally in C++, we have to manually use `new` and `delete` to manage dynamic memory. If we forget to delete an object, it can cause a memory leak. In this project, we are trying to solve this problem by creating our own basic garbage collection system.

The project uses the **Mark-and-Sweep** technique to find unused objects and delete them.

This project is based on Question 3 from the given mini-project list, which requires templates, proxy/control classes, constructor and destructor tracking, and dynamic memory allocation.

---

## Objectives

The main objectives of this project are:

* To understand how garbage collection works.
* To implement a simple garbage collector in C++.
* To create our own smart pointer.
* To understand dynamic memory allocation.
* To track references between objects.
* To identify unused objects.
* To handle cyclic references.
* To apply OOP concepts in a real project.
* To use C++ features such as templates and exception handling.

---

## How the Project Works

Our garbage collector mainly works in two steps:

### 1. Mark

First, the garbage collector starts from the objects that are marked as **root objects**.

It follows the references from these objects and marks all the objects that can be reached.

For example:

```text
A → B → C
```

If `A` is a root object, then `A`, `B`, and `C` are all marked as reachable.

### 2. Sweep

After marking, the garbage collector checks all the objects that have been created.

If an object was not marked, it means that the program cannot reach it anymore. Therefore, the garbage collector deletes it.

For example:

```text
A → B → C

D → E
```

If only `A` is a root, then:

```text
A, B, C → Kept

D, E → Deleted
```

---

## Cyclic References

One of the important parts of this project is handling **cyclic references**.

For example:

```text
A → B
↑   |
|___|
```

Here, A points to B and B points back to A.

Even though they reference each other, they should be deleted if there is no root pointing to them.

The Mark-and-Sweep algorithm can identify this because it checks whether an object is reachable from a root rather than simply checking whether it has references.

---

## Main Classes

We are using different classes to divide the project into smaller parts.

### `GCObject`

This is the base class for objects managed by the garbage collector.

It contains information such as:

* Object ID
* Mark status
* References to other objects

It also contains functions for adding references and displaying object information.

### `SmartPointer<T>`

This is our custom smart pointer.

It is implemented using a C++ template so that it can work with different types of objects.

For example:

```cpp
SmartPointer<StudentObject> student;
```

### `ControlBlock`

The control block stores information related to the smart pointer and object management.

### `GarbageCollector`

This is the main class responsible for garbage collection.

It handles:

* Registering objects
* Maintaining root objects
* Marking reachable objects
* Finding unused objects
* Deleting unused objects

---

## OOP Concepts Used

The project uses the following OOP concepts:

| Concept              | How we use it                                                          |
| -------------------- | ---------------------------------------------------------------------- |
| Classes              | Different parts of the garbage collector are represented using classes |
| Encapsulation        | Data members are kept private/protected                                |
| Inheritance          | Different object types inherit from `GCObject`                         |
| Polymorphism         | Virtual functions are used                                             |
| Abstraction          | Garbage collection operations are separated from object details        |
| Templates            | Used for `SmartPointer<T>`                                             |
| Constructors         | Used when creating objects                                             |
| Destructors          | Used to track object deletion                                          |
| Operator Overloading | Used for smart pointer operations                                      |
| Dynamic Memory       | Objects are created using `new`                                        |
| Exception Handling   | Used to handle invalid operations                                      |

The project is designed to demonstrate the OOP and advanced C++ requirements given in the mini-project rubric. The rubric specifically expects classes, encapsulation, polymorphism, virtual functions, templates, exception handling, operator overloading, and memory management.

---

## Example

Suppose we create four objects:

```text
Object A
Object B
Object C
Object D
```

And create the following references:

```text
A → B → C

D
```

If `A` is a root, the garbage collector will find:

```text
A → B → C
```

as reachable.

`D` is not reachable, so it will be deleted during garbage collection.

The output may look like:

```text
Running Garbage Collection...

Marking reachable objects...

Object A - Marked
Object B - Marked
Object C - Marked

Sweeping unused objects...

Object D - Deleted

Garbage Collection Completed.
```

---

## Project Structure

```text
GarbageCollector/
│
├── include/
│   ├── GCObject.h
│   ├── SmartPointer.h
│   ├── ControlBlock.h
│   └── GarbageCollector.h
│
├── src/
│   ├── GCObject.cpp
│   └── GarbageCollector.cpp
│
├── tests/
│   └── test_gc.cpp
│
├── main.cpp
├── README.md
└── data/
    └── gc_log.txt
```

---

## Requirements

To run this project, we need:

* C++ compiler
* C++17 or later
* VS Code / Visual Studio / Code::Blocks or any C++ IDE
* Git for version control

---

## How to Compile

Using GCC:

```bash
g++ -std=c++17 main.cpp src/*.cpp -Iinclude -o garbage_collector
```

Then run:

### Windows

```bash
garbage_collector.exe
```

### Linux/macOS

```bash
./garbage_collector
```

---

## Basic Menu

The project can have a simple menu like this:

```text
================================
   CUSTOM GARBAGE COLLECTOR
================================

1. Create Object
2. Create Reference
3. Add Root
4. Remove Root
5. Display Objects
6. Run Garbage Collection
7. Exit

Enter your choice:
```

This makes it easier to demonstrate the project during the final presentation.

---

## Testing

We will test the project using different situations.

### Test 1: Reachable Object

```text
A → B
```

If A is a root, both A and B should remain.

### Test 2: Unreachable Object

```text
A

B
```

If A is the only root, B should be deleted.

### Test 3: Multiple References

```text
A → B
A → C
```

If A is a root, B and C should remain.

### Test 4: Cyclic Reference

```text
A → B
B → A
```

If neither A nor B is a root, both should be deleted.

---

## Team Work

Since this is a two-member project, the work can be divided between both members.

### Member 1

* Create `GCObject`
* Create `SmartPointer`
* Work on dynamic memory management
* Implement object references

### Member 2

* Create `GarbageCollector`
* Implement Mark-and-Sweep
* Create the menu
* Handle testing and exceptions

Both members will work on integration, testing and documentation.

---

## GitHub

Git will be used to keep track of our project development.

Some example commits are:

```text
Initial project setup
Added GCObject class
Added SmartPointer class
Added object registration
Added root management
Implemented mark phase
Implemented sweep phase
Added cyclic reference handling
Added exception handling
Added menu
Added test cases
Updated README
Final project integration
```

The project requirements also ask for meaningful version-control history from both members.

---

## Future Improvements

If we get more time, we can improve the project by adding:

* A GUI
* Memory usage statistics
* Better smart pointer features
* Weak pointers
* Reference counting
* Graph visualization
* More object types
* Multithreading
* Performance comparison between different memory-management techniques

---

## Conclusion

This project helps us understand how memory management works internally and why garbage collection is useful.

By implementing our own garbage collector, we get practical experience with dynamic memory, object references, templates, smart pointers and the Mark-and-Sweep algorithm.

At the same time, the project allows us to apply the OOP concepts that we have learned in C++ to a practical problem.
