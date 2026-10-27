#ifndef SMARTPOINTER_H
#define SMARTPOINTER_H

#include "ControlBlock.h"

#include <stdexcept>
#include <utility>

template <typename T>
class SmartPointer
{
private:
    ControlBlock<T>* controlBlock;

    void release()
    {
        if (controlBlock == nullptr)
        {
            return;
        }

        controlBlock->decrement();

        if (!controlBlock->hasReferences())
        {
            delete controlBlock->getObject();
            delete controlBlock;
        }

        controlBlock = nullptr;
    }

public:
    // Default constructor
    SmartPointer()
        : controlBlock(nullptr)
    {
    }

    // Constructor from raw pointer
    explicit SmartPointer(T* ptr)
        : controlBlock(nullptr)
    {
        if (ptr != nullptr)
        {
            controlBlock = new ControlBlock<T>(ptr);
        }
    }

    // Copy constructor
    SmartPointer(const SmartPointer& other)
        : controlBlock(other.controlBlock)
    {
        if (controlBlock != nullptr)
        {
            controlBlock->increment();
        }
    }

    // Move constructor
    SmartPointer(SmartPointer&& other) noexcept
        : controlBlock(other.controlBlock)
    {
        other.controlBlock = nullptr;
    }

    // Copy assignment
    SmartPointer& operator=(const SmartPointer& other)
    {
        if (this == &other)
        {
            return *this;
        }

        release();

        controlBlock = other.controlBlock;

        if (controlBlock != nullptr)
        {
            controlBlock->increment();
        }

        return *this;
    }

    // Move assignment
    SmartPointer& operator=(SmartPointer&& other) noexcept
    {
        if (this == &other)
        {
            return *this;
        }

        release();

        controlBlock = other.controlBlock;
        other.controlBlock = nullptr;

        return *this;
    }

    // Destructor
    ~SmartPointer()
    {
        release();
    }

    // Dereference operator
    T& operator*() const
    {
        if (get() == nullptr)
        {
            throw std::runtime_error(
                "Attempted to dereference a null SmartPointer."
            );
        }

        return *get();
    }

    // Arrow operator
    T* operator->() const
    {
        if (get() == nullptr)
        {
            throw std::runtime_error(
                "Attempted to access a null SmartPointer."
            );
        }

        return get();
    }

    T* get() const
    {
        if (controlBlock == nullptr)
        {
            return nullptr;
        }

        return controlBlock->getObject();
    }

    std::size_t useCount() const
    {
        if (controlBlock == nullptr)
        {
            return 0;
        }

        return controlBlock->getReferenceCount();
    }

    bool isNull() const
    {
        return get() == nullptr;
    }

    explicit operator bool() const
    {
        return !isNull();
    }

    void reset()
    {
        release();
    }

    void swap(SmartPointer& other) noexcept
    {
        std::swap(controlBlock, other.controlBlock);
    }
};

#endif