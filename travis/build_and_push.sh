#!/usr/bin/env bash

# Where is the script?!
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

VERSION=${TRAVIS_TAG:-latest}

LEI_ISSUER_IMAGE_TAG=${LEI_ISSUER_IMAGE_TAG:-verifycreds/lei-issuer:$VERSION}
GLEIF_IMAGE_TAG=${GLEIF_IMAGE_TAG:-verifycreds/gleif:$VERSION}
ACME_IMAGE_TAG=${ACME_IMAGE_TAG:-verifycreds/acme:$VERSION}
TESTHOLDER_IMAGE_TAG=${TESTHOLDER_IMAGE_TAG:-verifycreds/test-holder:$VERSION}


build_and_push () {
    local IMAGE_TAG=$1
    local APP_NAME=$2
    local BUILD_DIR=$3

    echo "Building $APP_NAME docker image"
    (cd ${BUILD_DIR}; docker build -t ${IMAGE_TAG} .)

#    echo "Pushing $APP_NAME image $IMAGE_TAG"
#    docker push ${IMAGE_TAG}
}


build_and_push $LEI_ISSUER_IMAGE_TAG "LEI Issuer" "$DIR/../lei-issuer"
build_and_push $GLEIF_IMAGE_TAG "GLEIF" "$DIR/../gleif"
build_and_push $ACME_IMAGE_TAG "ACME" "$DIR/../acme"
build_and_push $TESTHOLDER_IMAGE_TAG "Test Holder" "$DIR/../test_holder"
