#!/usr/bin/env sh
set -eu

echo "OwnMail starter files:"
find apps docs infra -maxdepth 6 -type f | sort
