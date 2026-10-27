#include "../include/GarbageCollector.h"

#include <algorithm>
#include <fstream>
#include <iostream>
#include <sstream>

GarbageCollector::GarbageCollector(
    const std::string& logFilePath
)
    : totalCollections(0),
      totalCollectedObjects(0),
      logFile(logFilePath)
{
    std::ofstream file(logFile, std::ios::app);

    if (file)
    {
        file << "\n========================================\n";
        file << "Garbage Collector Started\n";
        file << "========================================\n";
    }
}

GarbageCollector::~GarbageCollector()
{
    collect();
}

void GarbageCollector::registerObject(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    objects.insert(object);

    std::ostringstream message;

    message << "Registered object #"
            << object->getId()
            << " ["
            << object->getTypeName()
            << "]";

    log(message.str());
}

void GarbageCollector::unregisterObject(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    roots.erase(object);
    objects.erase(object);

    std::ostringstream message;

    message << "Unregistered object #"
            << object->getId();

    log(message.str());
}

void GarbageCollector::addRoot(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    if (objects.find(object) == objects.end())
    {
        registerObject(object);
    }

    roots.insert(object);

    std::ostringstream message;

    message << "Added root object #"
            << object->getId();

    log(message.str());
}

void GarbageCollector::removeRoot(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    roots.erase(object);

    std::ostringstream message;

    message << "Removed root object #"
            << object->getId();

    log(message.str());
}

bool GarbageCollector::isRoot(GCObject* object) const
{
    return roots.find(object) != roots.end();
}

void GarbageCollector::markObject(GCObject* object)
{
    if (object == nullptr)
    {
        return;
    }

    if (object->isMarked())
    {
        return;
    }

    object->mark();
}

void GarbageCollector::mark()
{
    // First clear previous marks.
    for (GCObject* object : objects)
    {
        if (object != nullptr)
        {
            object->unmark();
        }
    }

    // Mark everything reachable from roots.
    for (GCObject* root : roots)
    {
        markObject(root);
    }
}

std::size_t GarbageCollector::sweep()
{
    std::vector<GCObject*> garbage;

    for (GCObject* object : objects)
    {
        if (object != nullptr && !object->isMarked())
        {
            garbage.push_back(object);
        }
    }

    for (GCObject* object : garbage)
    {
        std::ostringstream message;

        message << "Collecting object #"
                << object->getId()
                << " ["
                << object->getTypeName()
                << "]";

        log(message.str());

        roots.erase(object);
        objects.erase(object);

        delete object;
    }

    return garbage.size();
}

std::size_t GarbageCollector::collect()
{
    ++totalCollections;

    std::size_t before = objects.size();

    log("Starting garbage collection...");

    mark();

    std::size_t collected = sweep();

    totalCollectedObjects += collected;

    std::ostringstream message;

    message << "GC completed | Before: "
            << before
            << " | Collected: "
            << collected
            << " | Remaining: "
            << objects.size();

    log(message.str());

    return collected;
}

std::size_t GarbageCollector::getObjectCount() const
{
    return objects.size();
}

std::size_t GarbageCollector::getRootCount() const
{
    return roots.size();
}

std::size_t GarbageCollector::getTotalCollections() const
{
    return totalCollections;
}

std::size_t GarbageCollector::getTotalCollectedObjects() const
{
    return totalCollectedObjects;
}

void GarbageCollector::printStatistics() const
{
    std::cout << "\n========== GC STATISTICS ==========\n";

    std::cout << "Registered objects : "
              << objects.size()
              << '\n';

    std::cout << "Root objects       : "
              << roots.size()
              << '\n';

    std::cout << "GC collections     : "
              << totalCollections
              << '\n';

    std::cout << "Objects collected  : "
              << totalCollectedObjects
              << '\n';

    std::cout << "Live objects       : "
              << objects.size()
              << '\n';

    std::cout << "===================================\n";
}

void GarbageCollector::log(
    const std::string& message
) const
{
    std::ofstream file(
        logFile,
        std::ios::app
    );

    if (file)
    {
        file << message << '\n';
    }
}
