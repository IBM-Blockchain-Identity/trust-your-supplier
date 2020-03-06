FROM node:10-alpine

RUN apk add --update python g++ make

WORKDIR /opt/app

# Install NPM dependencies before the code (save time on builds)
COPY ./package.json /opt/app/package.json
#RUN npm install --production
RUN npm install

# Install our app code
COPY ./ /opt/app/

# Config parameters that don't change that often
ENV CARD_IMAGE_RENDERING=none

ENV CONNECTION_IMAGE_PROVIDER=static
ENV CONNECTION_ICON_PATH=/opt/app/docs/IFT-tile.png

ENV LOGIN_PROOF_PROVIDER=file
ENV LOGIN_PROOF_PATH=/opt/app/docs/IFT_login_proof_schema.json

ENV SIGNUP_PROOF_PROVIDER=none

ENV SCHEMA_TEMPLATE_PATH=/opt/app/docs/IFT_supplier_record.json
ENV ACCEPT_INCOMING_CONNECTIONS=false

CMD npm run debug
