#include "include/GCObject.h"
#include "include/SmartPointer.h"
#include "include/GarbageCollector.h"

#include <iostream>
#include <string>

// ------------------------------------------------------------
// Example class: Person
// ------------------------------------------------------------

class Person : public GCObject
{
private:
    std::string name;

public:
    explicit Person(const std::string& personName)
        : name(personName)
    {
        std::cout << "[CREATE] Person: "
                  << name
                  << " | ID: "
                  << getId()
                  << '\n';
    }

    ~Person() override
    {
        std::cout << "[DESTROY] Person: "
                  << name
                  << " | ID: "
                  << getId()
                  << '\n';
    }

    std::string getName() const
    {
        return name;
    }

    std::string getTypeName() const override
    {
        return "Person";
    }
};

// ------------------------------------------------------------
// Example class: Node
// Used to demonstrate object references and cycles
// ------------------------------------------------------------

class Node : public GCObject
{
private:
    int value;

public:
    explicit Node(int nodeValue)
        : value(nodeValue)
    {
        std::cout << "[CREATE] Node: "
                  << value
                  << " | ID: "
                  << getId()
                  << '\n';
    }

    ~Node() override
    {
        std::cout << "[DESTROY] Node: "
                  << value
                  << " | ID: "
                  << getId()
                  << '\n';
    }

    int getValue() const
    {
        return value;
    }

    void connect(Node* other)
    {
        addReference(other);
    }

    std::string getTypeName() const override
    {
        return "Node";
    }
};

// ------------------------------------------------------------
// Main demonstration
// ------------------------------------------------------------

int main()
{
    std::cout << "\n";
    std::cout << "==============================================\n";
    std::cout << " CUSTOM GARBAGE COLLECTOR & SMART POINTERS\n";
    std::cout << "==============================================\n\n";

    GarbageCollector gc("data/gc_log.txt");

    // --------------------------------------------------------
    // 1. Smart Pointer demonstration
    // --------------------------------------------------------

    std::cout << "\n[1] SMART POINTER DEMONSTRATION\n";
    std::cout << "----------------------------------------------\n";

    SmartPointer<Person> person1(
        new Person("Alice")
    );

    std::cout << "Person1 reference count: "
              << person1.useCount()
              << '\n';

    {
        SmartPointer<Person> person2 = person1;

        std::cout << "After copying:\n";

        std::cout << "Person1 count: "
                  << person1.useCount()
                  << '\n';

        std::cout << "Person2 count: "
                  << person2.useCount()
                  << '\n';

        std::cout << "Access through SmartPointer: "
                  << person2->getName()
                  << '\n';
    }

    std::cout << "After person2 leaves scope:\n";

    std::cout << "Person1 count: "
              << person1.useCount()
              << '\n';

    // --------------------------------------------------------
    // 2. Garbage Collector registration
    // --------------------------------------------------------

    std::cout << "\n[2] OBJECT REGISTRATION\n";
    std::cout << "----------------------------------------------\n";

    Person* alice = new Person("Alice-GC");
    Person* bob = new Person("Bob-GC");

    gc.registerObject(alice);
    gc.registerObject(bob);

    std::cout << "Objects registered: "
              << gc.getObjectCount()
              << '\n';

    // --------------------------------------------------------
    // 3. Root object
    // --------------------------------------------------------

    std::cout << "\n[3] ROOT MANAGEMENT\n";
    std::cout << "----------------------------------------------\n";

    gc.addRoot(alice);

    std::cout << "Root count: "
              << gc.getRootCount()
              << '\n';

    // --------------------------------------------------------
    // 4. First collection
    // --------------------------------------------------------

    std::cout << "\n[4] FIRST GARBAGE COLLECTION\n";
    std::cout << "----------------------------------------------\n";

    std::size_t collected = gc.collect();

    std::cout << "Objects collected: "
              << collected
              << '\n';

    gc.printStatistics();

    // --------------------------------------------------------
    // 5. Create a reachable graph
    // --------------------------------------------------------

    std::cout << "\n[5] OBJECT GRAPH\n";
    std::cout << "----------------------------------------------\n";

    Node* node1 = new Node(10);
    Node* node2 = new Node(20);
    Node* node3 = new Node(30);

    node1->connect(node2);
    node2->connect(node3);

    gc.registerObject(node1);
    gc.registerObject(node2);
    gc.registerObject(node3);

    gc.addRoot(node1);

    std::cout << "Graph:\n";
    std::cout << "Node1 -> Node2 -> Node3\n";

    // --------------------------------------------------------
    // 6. Mark and Sweep
    // --------------------------------------------------------

    std::cout << "\n[6] MARK-AND-SWEEP\n";
    std::cout << "----------------------------------------------\n";

    gc.collect();

    gc.printStatistics();

    // --------------------------------------------------------
    // 7. Demonstrate unreachable cycle
    // --------------------------------------------------------

    std::cout << "\n[7] CYCLIC REFERENCE TEST\n";
    std::cout << "----------------------------------------------\n";

    Node* cycleA = new Node(100);
    Node* cycleB = new Node(200);

    cycleA->connect(cycleB);
    cycleB->connect(cycleA);

    gc.registerObject(cycleA);
    gc.registerObject(cycleB);

    std::cout << "Created cycle:\n";
    std::cout << "CycleA <-> CycleB\n";

    std::cout << "Before GC:\n";
    gc.printStatistics();

    // They are not roots, so they should be collected.
    gc.collect();

    std::cout << "After GC:\n";
    gc.printStatistics();

    // --------------------------------------------------------
    // 8. Remove Alice root
    // --------------------------------------------------------

    std::cout << "\n[8] REMOVING ROOT\n";
    std::cout << "----------------------------------------------\n";

    gc.removeRoot(alice);

    gc.collect();

    gc.printStatistics();

    // --------------------------------------------------------
    // Final statistics
    // --------------------------------------------------------

    std::cout << "\n==============================================\n";
    std::cout << " PROJECT EXECUTION COMPLETED\n";
    std::cout << "==============================================\n";

    gc.printStatistics();

    return 0;
}