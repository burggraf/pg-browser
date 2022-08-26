# pg-browser
PostgreSQL.  In a browser.  FTW.

## build instructions (work in progress)

### notes
- At this time, postgres using the older buildroot release (the default setup for `browser-vm`)
- Switching to the latest buildroot (**2022.05.1**) compiles the `v86-linux.iso` file and includes postgres, but postgres crashes with a segfault on startup
- Additional changes may need to be made to the `buildroot-v86` folder before building this

### build steps

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

### inside vm:

```
make BR2_EXTERNAL=/buildroot-v86 v86_defconfig
make menuconfig
```

### configure to include postgres

- Toolchain -> Enable WCHAR support
- Target Packages -> Libraries -> Database -> postgresql & postgresql-full
- save configuration & exit

```
make
```
