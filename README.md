# pg-browser
PostgreSQL.  In a browser.  FTW.

## build instructions (work in progress)

```sh
git clone https://github.com/humphd/browser-vm
cd browser-vm
```

Modify Dockerfile line 4:
`ARG BUILD_ROOT_RELEASE=2022.05.1`

```sh
docker run \
    --rm \
    --name build-v86 \
    -v $PWD/dist:/build \
    -v $PWD/buildroot-v86/:/buildroot-v86 \
    -ti \
    --entrypoint "bash" \
    buildroot
```

inside vm:

```
make BR2_EXTERNAL=/buildroot-v86 v86_defconfig
make menuconfig
```

...configure to include postgres
Toolchain -> Enable WCHAR support
Target Packages -> Libraries -> Database -> postgresql & postgresql-full

```
make
```
