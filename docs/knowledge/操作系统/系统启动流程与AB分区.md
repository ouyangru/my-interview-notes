# 系统启动流程与 A/B 分区

## 状态

`[weak] [wrong] [interview] [project]`

## 来源

- 2026-09-21 Sharpa 嵌入式软件一面。
- x86 教学 OS 项目：BIOS / MBR / Loader / 实模式 / 保护模式 / 分页 / Kernel。
- TBox / 嵌入式产品语境：A/B 分区、OTA 和启动回滚。

## 我的现场问题

Sharpa 一面里，传统 x86 启动主干基本能够讲出来：

> BIOS → 第一个扇区 → Loader → 实模式 → GDT → 保护模式 → Kernel → 内存/文件系统/调度初始化 → 第一个应用程序。

但当面试官加入 A/B 分区后，我回答：

> 内核里面似乎有一个环境变量来存储当前是 A 分区还是 B 分区。

这个阶段关系不对。**如果要决定加载 A 还是 B 的 kernel/rootfs，做决定时目标 kernel 还没有启动，因此不能把 slot selection 放到目标内核起来以后。**

## 传统 x86 教学 OS 启动主线

以 BIOS/MBR 方式为例：

1. CPU Reset 后从固件入口执行 BIOS。
2. BIOS 做基本硬件初始化和启动设备选择。
3. BIOS 把启动盘 MBR 的 512B 读入约定内存位置并跳转。
4. MBR 受空间限制，只做最小引导，再加载更完整的 Loader。
5. Loader 在实模式下获取内存等信息，准备 GDT。
6. 设置 CR0.PE，经过远跳转进入保护模式。
7. 准备分页结构，按项目需要打开分页。
8. 从磁盘读取 kernel ELF，把各 segment 放到目标内存。
9. 跳到 kernel entry。
10. 内核继续初始化 IDT/中断、内存管理、任务调度、文件系统、系统调用等。
11. 创建第一个用户进程或 shell。

## A/B slot selection 在哪里发生

产品级 A/B 系统会在“加载目标内核/根文件系统之前”增加 slot 选择步骤。

典型逻辑可以抽象为：

> ROM / 一级引导 → Bootloader → 读取 slot metadata → 选择 A/B → 加载对应 kernel / ramdisk / rootfs → 启动系统 → 用户态确认启动成功

因此面试首先要说：

> **A/B 的启动选择核心发生在 Bootloader 阶段。**

## metadata 一般记录什么

不同平台字段名称不完全相同，但常见语义包括：

- 当前 slot 的 priority；
- slot 是否 bootable；
- remaining tries / retry count；
- successful boot 标志；
- 当前 active / target slot；
- 镜像版本、校验信息等实现相关数据。

不要死背某一家平台字段，但要知道为什么至少需要“优先级 + 尝试次数 + 成功标志”：Bootloader 要能识别“新版本第一次试启动”和“已经稳定启动过的旧版本”，并在失败时回滚。

## OTA 与 A/B 的关系

典型思路：

1. 当前运行 A。
2. OTA 把新镜像写入 inactive B。
3. 做完整性/签名校验。
4. 更新 slot metadata，使 B 成为下一次优先启动目标。
5. 重启后 Bootloader 尝试从 B 启动。
6. 新系统起来后，在满足条件时标记 successful boot。
7. 如果 B 连续若干次无法启动，Bootloader 根据 retry count 回退 A。

A/B 的价值不是“两个系统都一起运行”，而是让升级写入非活动分区，避免直接破坏当前可工作的系统，并提供回滚路径。

## 面试推荐回答

> 如果只讲我的 x86 教学 OS，启动流程是 BIOS 先把 MBR 加载进内存，MBR 再加载后续 Loader；Loader 完成 GDT、实模式到保护模式切换、分页准备和 kernel ELF 加载，然后跳到内核，内核再初始化中断、内存、调度和文件系统。
>
> 如果系统再加入 A/B 分区，slot selection 应该发生在 Bootloader 加载目标 kernel/rootfs 之前。Bootloader 会读取持久化的 slot metadata，例如优先级、剩余启动次数和 successful 标志，选择一个可启动 slot。OTA 通常写 inactive slot，第一次启动成功后再确认 successful；如果连续启动失败则回滚旧 slot。
>
> 我之前把这个选择说成“内核里的环境变量”是不准确的，因为决定加载哪个目标内核时，目标内核本身还没有运行。

## 易错点

- `[wrong]` 不要说“内核决定自己从 A 还是 B 启动”。
- A/B 是产品启动/升级机制，不要和自己的教学 OS 原始实现强行说成同一个项目里已经实现。
- Bootloader 环境变量可以是实现 slot metadata 的一种载体，但“有环境变量”不是核心答案，阶段关系才是核心。
- MBR/BIOS 是传统 x86 教学路径，真实 ARM SoC 往往是 BootROM → SPL/BLx/U-Boot 等另一套启动链，不要混为同一套固定实现。

## 下一次追问

1. 为什么 A/B 要写 inactive slot，而不是原地覆盖 active slot？
2. 如果新 slot 内核能起来，但用户态服务反复崩溃，什么时候才应该标 successful boot？
3. retry count 在哪一阶段递减？
4. Bootloader 本身怎么升级？A/B 能否保护 Bootloader？
5. Android A/B / Virtual A/B 和传统双完整分区有什么差异？


## 2026-09-21 追加：slot metadata 到底存在哪里、Bootloader 怎么读

### 1. 先记结论：位置平台相关，阶段关系才是核心

A/B metadata 不是“内核启动以后临时生成的变量”，而是需要跨重启保存的持久化状态，所以它必须落在非易失性存储里。

底层介质可能是：

- eMMC；
- UFS；
- NAND / NOR Flash；
- 其他厂商定义的持久化存储。

具体放在哪个逻辑区域没有统一答案，常见实现包括：

- 独立的 `misc` / `metadata` / `bootctrl` 一类分区；
- GPT 分区表或分区属性中的 slot 状态；
- U-Boot environment；
- 厂商自己定义的一小块持久化区域。

面试不能死背“肯定在 misc”或“肯定在 U-Boot env”。更稳的回答是：

> metadata 的具体存储位置依平台实现而定，但它一定是 Bootloader 能在目标 kernel 启动之前读取到的持久化状态。

### 2. Bootloader 为什么能读它

Bootloader 在选择 A/B 之前，已经至少完成了足够的基础硬件初始化，能够访问启动介质，例如 eMMC/UFS/NAND。

所以逻辑顺序是：

> 上电 / BootROM → 前级引导 → 初始化存储控制器 → 读取分区表和 slot metadata → 选择 A/B → 读取对应 boot_a / boot_b → 校验并加载 kernel / ramdisk / dtb → 跳转 kernel。

不是“先进 kernel，再看变量决定自己来自哪个 slot”。

### 3. metadata 里为什么需要这些字段

可以用一个抽象例子理解：

```text
slot A:
priority = 15
tries_remaining = 0
successful_boot = 1

slot B:
priority = 14
tries_remaining = 3
successful_boot = 0
```

这些字段分别解决：

- `priority`：多个可启动 slot 谁优先；
- `tries_remaining`：一个新版本最多试启动几次；
- `successful_boot`：这个版本是否已经被用户态确认稳定启动；
- bootable / invalid：某个 slot 是否已经被判定不能继续尝试。

字段名字可以不同，但语义基本围绕“选谁、还能试几次、以前是否成功”。

### 4. OTA 后一次完整状态变化

假设当前稳定运行 A：

1. 系统把新镜像写入 inactive B；
2. 做镜像完整性/签名检查；
3. 修改持久化 slot metadata，让 B 成为下一次优先启动目标；
4. 重启；
5. Bootloader 读取 metadata，选择 B；
6. 读取 `boot_b` / 对应 rootfs，加载并启动；
7. 如果启动失败，重启后 `tries_remaining` 继续减少；
8. 如果耗尽仍失败，回退 A；
9. 如果 B 真正进入稳定用户态，再由用户态/系统服务通过平台接口把 B 标成 successful。

关键点：

> “kernel 能跑起来”不一定就应该立即标 successful。产品通常需要等关键用户态服务、挂载、健康检查等满足条件以后再确认，避免一个只能起 kernel、但业务完全不可用的版本被永久认定为成功。

### 5. 面试推荐回答

> A/B 的 slot 状态必须跨重启保存，所以会放在 eMMC、UFS、NAND 这类非易失性存储里。具体位置是平台相关的，可能是 misc/metadata/bootctrl 一类独立分区，也可能利用 GPT slot 属性、U-Boot environment 或厂商自定义区域。Bootloader 在初始化存储设备后先读取这些 metadata，根据 priority、remaining tries、successful 等状态选择 A 或 B，然后才去加载对应的 boot_a/boot_b 和 rootfs。OTA 一般写 inactive slot，新 slot 启动成功后再确认 successful；连续失败则根据剩余尝试次数回滚旧 slot。

### 6. 易错点

- 不要说“metadata 一定在某个固定分区”。
- 不要把“U-Boot environment 是一种可能实现”说成所有系统都如此。
- 不要把 eMMC / UFS 当成“分区名”；它们是底层存储介质，slot metadata 是其上的逻辑数据结构/分区/属性。
- 不要说“内核通过环境变量选择自己从 A/B 启动”；slot 选择发生得更早。
