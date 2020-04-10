#!/bin/sh

if [ "$1" = "/?" ] || [ "$1" = "--help" ] || [ "$1" = "?" ]
then
  echo "** Cleans up connections and credentials generated during a demo run **"
  echo "** Optionally cleans up a list of accounts from ift-founder, tys and ift-network **"
  echo "syntax: cleanupAfterDemo <comma-separated list of account usernames>"
else
  echo "** cleaning up connections, credentials and accounts generated during a demo run **"
  CA_TEST_NAME=cleanupAfterDemo CA_TEST_CLEANUP_ACCOUNTS=$1 docker-compose up --exit-code-from test test
fi

