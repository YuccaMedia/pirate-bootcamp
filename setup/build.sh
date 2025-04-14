#!/bin/bash

# This script will build all programs

echo "\n\n================================================="
echo "\n             Building All Programs"
echo "\n\n================================================="
sleep 4

# Build the program
cd ../quest-4/programs/swap-program
cargo build-sbf

# Create target directory if it doesn't exist
mkdir -p ../../../target/sbf-solana-solana/release/

# Copy the .so file to the expected location
cp ../../target/deploy/swap_program.so ../../../target/sbf-solana-solana/release/

echo "\n Build completed. Program binary copied to target location."