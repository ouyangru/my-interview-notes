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
