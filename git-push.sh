#!/bin/bash

if [ "$#" -ne 1 ]
then
  echo "Git message needed. Exiting."
  exit 1
fi

git add .
git commit -a -m "$1"
git push
