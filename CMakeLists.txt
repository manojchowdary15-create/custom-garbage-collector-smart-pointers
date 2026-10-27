cmake_minimum_required(VERSION 3.15)

project(CustomGarbageCollector
    VERSION 1.0
    DESCRIPTION "Custom Mark-and-Sweep Garbage Collector and Smart Pointers"
    LANGUAGES CXX
)

# ------------------------------------------------------------
# C++ Standard
# ------------------------------------------------------------

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ------------------------------------------------------------
# Include directories
# ------------------------------------------------------------

include_directories(
    ${PROJECT_SOURCE_DIR}/include
)

# ------------------------------------------------------------
# Library source files
# ------------------------------------------------------------

set(GC_SOURCES
    src/GCObject.cpp
    src/GarbageCollector.cpp
)

# ------------------------------------------------------------
# Main executable
# ------------------------------------------------------------

add_executable(
    garbage_collector
    main.cpp
    ${GC_SOURCES}
)

# ------------------------------------------------------------
# Test executable
# ------------------------------------------------------------

add_executable(
    gc_tests
    tests/test_gc.cpp
    ${GC_SOURCES}
)

# ------------------------------------------------------------
# Compiler warnings
# ------------------------------------------------------------

if(MSVC)

    target_compile_options(
        garbage_collector
        PRIVATE /W4
    )

    target_compile_options(
        gc_tests
        PRIVATE /W4
    )

else()

    target_compile_options(
        garbage_collector
        PRIVATE
        -Wall
        -Wextra
        -Wpedantic
    )

    target_compile_options(
        gc_tests
        PRIVATE
        -Wall
        -Wextra
        -Wpedantic
    )

endif()

# ------------------------------------------------------------
# Enable testing
# ------------------------------------------------------------

enable_testing()

add_test(
    NAME GarbageCollectorTests
    COMMAND gc_tests
)

# ------------------------------------------------------------
# Create data directory
# ------------------------------------------------------------

file(
    MAKE_DIRECTORY
    ${PROJECT_SOURCE_DIR}/data
)