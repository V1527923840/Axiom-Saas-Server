FROM node:24.14.1-alpine

RUN apk add --no-cache bash
RUN npm i -g @nestjs/cli typescript ts-node

COPY package*.json /tmp/app/
RUN cd /tmp/app && npm install

COPY . /usr/src/app
RUN cp -a /tmp/app/node_modules /usr/src/app
COPY ./wait-for-it.sh /opt/wait-for-it.sh
RUN chmod +x /opt/wait-for-it.sh
COPY ./startup.relational.ci.sh /opt/startup.relational.ci.sh
RUN chmod +x /opt/startup.relational.ci.sh
RUN sed -i 's/\r//g' /opt/wait-for-it.sh
RUN sed -i 's/\r//g' /opt/startup.relational.ci.sh

WORKDIR /usr/src/app
RUN echo "" > .env
# ★ `npm run migration:run` / `seed:run:relational` 走的是
#   `env-cmd -f .env.dev`,而 CI 容器里只有 env_file 注入的环境变量,
#   没有 .env.dev 文件 —— env-cmd 会直接报
#   "Failed to find .env file at path: .env.dev" 并以退出码 1 中断。
#   容器内的真实配置来自 compose 的 env_file(env-example-relational),
#   这里只需要一个占位文件让 env-cmd 能启动。
RUN echo "" > .env.dev
RUN npm run build

CMD ["/opt/startup.relational.ci.sh"]
