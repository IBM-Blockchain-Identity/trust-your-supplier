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
ENV CONNECTION_ICON_PATH=/opt/app/docs/IFTNetworkLogo.png

ENV LOGIN_PROOF_PROVIDER=file
ENV LOGIN_PROOF_PATH=/opt/app/docs/IFT_member_login_proof_schema.json

ENV SIGNUP_PROOF_PROVIDER=account
ENV SIGNUP_ACCOUNT_PROOF_PATH_TYS=/opt/app/docs/account_proof_request_TYS.json
ENV SIGNUP_ACCOUNT_PROOF_PATH_LEI=/opt/app/docs/account_proof_request_LEI.json

ENV SCHEMA_TEMPLATE_PATH=/opt/app/docs/IFT_member_credential.json

CMD npm run start
