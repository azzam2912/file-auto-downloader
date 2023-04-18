#!/bin/bash

# move files containing "" from downloads directory to newdir directory
find ./downloads -type f -iname "*usemo*" -print0 | xargs -0 -I {} mv {} newdir/
