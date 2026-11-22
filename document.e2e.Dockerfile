FROM node:24.14.1-alpine

RUN apk add --no-cache bash
RUN npm i -g @nestjs/cli typescript ts-node

COPY package*.json /tmp/app/
RUN cd /tmp/app && npm install

COPY . /usr/src/app
RUN cp -a /tmp/app/node_modules /usr/src/app
COPY ./wait-for-it.sh /opt/wait-for-it.sh
RUN chmod +x /opt/wait-for-it.sh
COPY ./startup.document.ci.sh /opt/startup.document.ci.sh
RUN chmod +x /opt/startup.document.ci.sh
RUN sed -i 's/\r//g' /opt/wait-for-it.sh
RUN sed -i 's/\r//g' /opt/startup.document.ci.sh

WORKDIR /usr/src/app
RUN echo "" > .env
# ★ `npm run seed:run:document` 走的是 `env-cmd -f .env.dev`,
#   而 CI 容器里只有 env_file 注入的环境变量,没有 .env.dev 文件 ——
#   env-cmd 会报 "Failed to find .env file at path: .env.dev" 并中断。
#   这里补一个占位文件让 env-cmd 能启动。
RUN echo "" > .env.dev
RUN npm run build

CMD ["/opt/startup.document.ci.sh"]
