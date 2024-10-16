#! /bin/bash

cd ./output/metadata/states
for dir in */; do mkdir -p "$dir/pdfs"; done