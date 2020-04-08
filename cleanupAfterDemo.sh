#!/bin/sh

CA_TEST_NAME=cleanupAfterDemo docker-compose up --exit-code-from test test
