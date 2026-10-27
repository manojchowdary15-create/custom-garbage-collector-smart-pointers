#include "../include/GCObject.h"

#include <algorithm>
#include <atomic>

namespace
{
    std::atomic<std::size_t> nextObjectId{1};
    std::atomic<std::size_t> totalObjects{0};
}

GCObject::GCObject()
    : objectId(nextObjectId++),
      marked(false)
{
    ++totalObjects;
}

GCObject::~GCObject()
{
    --totalObjects;
}

void GCObject::mark()
{
    if (marked)
    {
        return;
    }

    marked = true;

    trace();
}

void GCObject::unmark()
{
    marked = false;
}

bool GCObject::isMarked() const
{
    return marked;
}

std::size_t GCObject::getId() const
{
    return objectId;
}

std::string GCObject::getTypeName() const
{
    return "GCObject";
}

void GCObject::addReference(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    auto it = std::find(
        references.begin(),
        references.end(),
        object
    );

    if (it == references.end())
    {
        references.push_back(object);
    }
}

void GCObject::removeReference(GCObject* object)
{
    references.erase(
        std::remove(
            references.begin(),
            references.end(),
            object
        ),
        references.end()
    );
}

const std::vector<GCObject*>& GCObject::getReferences() const
{
    return references;
}

void GCObject::trace()
{
    for (GCObject* reference : references)
    {
        if (reference != nullptr)
        {
            reference->mark();
        }
    }
}

std::size_t GCObject::getTotalObjects()
{
    return totalObjects.load();
}