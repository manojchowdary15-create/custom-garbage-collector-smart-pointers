#ifndef GCOBJECT_H
#define GCOBJECT_H

#include <cstddef>
#include <string>
#include <vector>

class GCObject
{
private:
    std::size_t objectId;
    bool marked;

protected:
    std::vector<GCObject*> references;

public:
    GCObject();
    virtual ~GCObject();

    // Mark and sweep support
    void mark();
    void unmark();
    bool isMarked() const;

    // Object information
    std::size_t getId() const;
    virtual std::string getTypeName() const;

    // Reference management
    void addReference(GCObject* object);
    void removeReference(GCObject* object);

    const std::vector<GCObject*>& getReferences() const;

    // Used by the garbage collector
    virtual void trace();

    static std::size_t getTotalObjects();
};

#endif