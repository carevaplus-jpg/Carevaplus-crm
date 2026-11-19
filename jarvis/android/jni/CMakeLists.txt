# Builds libjarvis_llama.so: the JNI bridge plus llama.cpp, statically linked.
#   cmake -DLLAMA_DIR=/path/to/llama.cpp ...
cmake_minimum_required(VERSION 3.22)
project(jarvis_llama CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(LLAMA_DIR "" CACHE PATH "Path to a llama.cpp checkout")
if(NOT LLAMA_DIR)
  message(FATAL_ERROR "Set -DLLAMA_DIR=/path/to/llama.cpp")
endif()

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_COMMON OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_TOOLS OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(LLAMA_CURL OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)
add_subdirectory(${LLAMA_DIR} llama-build EXCLUDE_FROM_ALL)

# JARVIS_LIB_NAME lets the build produce two variants: a fast one for phones with the ARM
# "dotprod" instructions (most phones since 2018) and a compatible one for older phones.
set(JARVIS_LIB_NAME "jarvis_llama" CACHE STRING "Output library name")
add_library(jarvis_llama SHARED jarvis_llama.cpp)
set_target_properties(jarvis_llama PROPERTIES OUTPUT_NAME ${JARVIS_LIB_NAME})
if(NOT ANDROID)
  find_package(JNI REQUIRED)
  target_include_directories(jarvis_llama PRIVATE ${JNI_INCLUDE_DIRS})
endif()
target_link_libraries(jarvis_llama PRIVATE llama ggml)
if(ANDROID)
  target_link_options(jarvis_llama PRIVATE -Wl,--gc-sections -Wl,-z,max-page-size=16384)
  target_link_libraries(jarvis_llama PRIVATE log android)
endif()
