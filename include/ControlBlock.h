#ifndef CONTROLBLOCK_H
#define CONTROLBLOCK_H

#include <cstddef>

template <typename T>
class ControlBlock
{
private:
    T* object;
    std::size_t referenceCount;

public:
    explicit ControlBlock(T* ptr)
        : object(ptr),
          referenceCount(1)
    {
    }

    T* getObject() const
    {
        return object;
    }

    std::size_t getReferenceCount() const
    {
        return referenceCount;
    }

    void increment()
    {
        ++referenceCount;
    }

    void decrement()
    {
        if (referenceCount > 0)
        {
            --referenceCount;
        }
    }

    bool hasReferences() const
    {
        return referenceCount > 0;
    }
};

#endif