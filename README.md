# upbit wallet watchdog

## requirements
- docker, docker-compose

## setup
- change access/secret key on docker-compose.yml
    ```yaml
    environment:
      UPBIT_OPEN_API_ACCESS_KEY: 
      UPBIT_OPEN_API_SECRET_KEY: 
      UPBIT_OPEN_API_SERVER_URL: https://api.upbit.com
      UPBIT_OPEN_API_SERVER_URL: wss://api.upbit.com/websocket/v1
    ```

## run
```sh
git clone https://github.com/Kur0N3k0/upbit-wallet-watchdog
cd upbit-wallet-watchdog
docker-compose up
```