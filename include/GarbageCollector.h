#ifndef GARBAGECOLLECTOR_H
#define GARBAGECOLLECTOR_H

#include "GCObject.h"

#include <cstddef>
#include <string>
#include <unordered_set>
#include <vector>

class GarbageCollector
{
private:
    std::unordered_set<GCObject*> objects;
    std::unordered_set<GCObject*> roots;

    std::size_t totalCollections;
    std::size_t totalCollectedObjects;

    std::string logFile;

    void mark();
    std::size_t sweep();

    void markObject(GCObject* object);

    void log(const std::string& message) const;

public:
    explicit GarbageCollector(
        const std::string& logFilePath = "data/gc_log.txt"
    );

    ~GarbageCollector();

    // Object management
    void registerObject(GCObject* object);
    void unregisterObject(GCObject* object);

    // Root management
    void addRoot(GCObject* object);
    void removeRoot(GCObject* object);

    bool isRoot(GCObject* object) const;

    // Garbage collection
    std::size_t collect();

    // Information
    std::size_t getObjectCount() const;
    std::size_t getRootCount() const;
    std::size_t getTotalCollections() const;
    std::size_t getTotalCollectedObjects() const;

    void printStatistics() const;
};

#endif