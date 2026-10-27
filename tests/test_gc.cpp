#include "../include/GCObject.h"
#include "../include/SmartPointer.h"
#include "../include/GarbageCollector.h"

#include <cassert>
#include <iostream>

class TestObject : public GCObject
{
private:
    int value;

public:
    explicit TestObject(int v)
        : value(v)
    {
    }

    ~TestObject() override = default;

    int getValue() const
    {
        return value;
    }

    std::string getTypeName() const override
    {
        return "TestObject";
    }
};

void testSmartPointer()
{
    std::cout << "[TEST] SmartPointer...\n";

    SmartPointer<TestObject> ptr(
        new TestObject(42)
    );

    assert(ptr);
    assert(ptr->getValue() == 42);
    assert(ptr.useCount() == 1);

    {
        SmartPointer<TestObject> copy = ptr;

        assert(ptr.useCount() == 2);
        assert(copy.useCount() == 2);
        assert(copy->getValue() == 42);
    }

    assert(ptr.useCount() == 1);

    std::cout << "       PASSED\n";
}

void testGarbageCollector()
{
    std::cout << "[TEST] GarbageCollector...\n";

    GarbageCollector gc("data/gc_log.txt");

    TestObject* object = new TestObject(100);

    gc.registerObject(object);

    assert(gc.getObjectCount() == 1);

    gc.addRoot(object);

    assert(gc.getRootCount() == 1);

    gc.collect();

    // Root keeps object alive.
    assert(gc.getObjectCount() == 1);

    gc.removeRoot(object);

    gc.collect();

    // Object should now be collected.
    assert(gc.getObjectCount() == 0);

    std::cout << "       PASSED\n";
}

void testReferences()
{
    std::cout << "[TEST] Object references...\n";

    GarbageCollector gc("data/gc_log.txt");

    TestObject* parent = new TestObject(1);
    TestObject* child = new TestObject(2);

    parent->addReference(child);

    gc.registerObject(parent);
    gc.registerObject(child);

    gc.addRoot(parent);

    gc.collect();

    // Both should survive because child is reachable from parent.
    assert(gc.getObjectCount() == 2);

    gc.removeRoot(parent);

    gc.collect();

    assert(gc.getObjectCount() == 0);

    std::cout << "       PASSED\n";
}

int main()
{
    std::cout << "\n";
    std::cout << "=====================================\n";
    std::cout << " GARBAGE COLLECTOR TEST SUITE\n";
    std::cout << "=====================================\n\n";

    testSmartPointer();
    testGarbageCollector();
    testReferences();

    std::cout << "\n=====================================\n";
    std::cout << " ALL TESTS PASSED\n";
    std::cout << "=====================================\n";

    return 0;
}