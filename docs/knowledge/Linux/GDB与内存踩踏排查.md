# GDB 与内存踩踏排查

## 状态

`[weak] [interview] [project]`

## 2026-10-15 现场缺口 { #cxx-20261015-gdb }

来源：[C++ 开发岗位一面 · 问题 10～13](../../interviews/2026-10-15-公司未确认-C++开发岗位一面.md#q10-gdb)。

现场能讲出 voice core 崩溃后通过调用栈定位到日志文件名解析，并用分支差异解释为什么 dev 分支正常、稳定分支异常；这是真实的工程证据。但 GDB 基础追问连续中断：

- 知道 `next` 是步进，但说不出 `break`；
- 接近答出 `info threads` 和 `bt`，线程切换命令不确定；
- 不知道内存被更早写坏、后来才崩溃时怎样抓真正写坏现场。

2026-09-16 岚图一面已经出现“GDB 除 `bt` 外基础命令不稳”，本场换成断点、多线程和内存踩踏后仍然失分，所以这是重复薄弱点，不是单次忘词。

## 最小可用命令链

### 启动、断点与源码步进

```text
gdb ./app
break function_name
break file.cpp:123
run
continue
next       # 下一源码行，通常不进入被调函数
step       # 下一源码行，进入有调试信息的被调函数
finish     # 运行到当前函数返回
info breakpoints
delete 1
```

条件断点用 `condition <断点号> <表达式>`；查看状态用 `print`、`display`、`info args`、`info locals`。GUI 的红点只是这些能力的界面，不能替代命令语义。

### core dump 与调用栈

```text
gdb ./app core
bt
frame 2
up
down
info args
info locals
info registers
```

必须使用与崩溃进程匹配的可执行文件、调试符号、动态库和源码版本。`bt` 显示的是程序**最终崩溃时**的调用链，不保证当前行就是最早写坏内存的位置。

### 多线程

```text
info threads
thread 3
bt
thread apply all bt
```

GDB 自己的 thread number 用于 `thread 3`；输出中的 LWP/TID 是操作系统线程标识，不能随意混为同一个编号。死锁或跨线程崩溃时，`thread apply all bt` 比只看当前线程更完整。

## 内存踩踏的因果模型

“踩内存”常见为越界写、use-after-free、错误长度的 `memcpy`、数据竞争等。真正错误发生在 `t1`，被破坏的数据到 `t2` 才被当前线程读取，因此 core 里的崩溃点可能只是受害者：

`更早的非法写入 → 对象/指针/堆元数据被破坏 → 程序继续运行 → 后续合法访问触发崩溃`

排查顺序：

1. 保存 core、二进制、符号、库和版本，确认被破坏的地址与对象；
2. 尽量缩小输入和并发，获得稳定复现；
3. 开发环境优先用 ASan，在非法写或 use-after-free 发生时直接报告写入栈；
4. 已知某个稳定地址被异常修改时，在对象有效期间用 `watch`/`awatch` 设置硬件监视点，抓第一次写入；
5. 难以用 sanitizer 的板端可增加 canary、长度/序号、分配释放与线程日志，检查所有边界拷贝；必要时用 guard page 把越界更早变成故障。

硬件 watchpoint 数量有限，地址也可能因重新分配而改变；不能把它描述成任何偶现踩内存都能“一键定位”。

## 面试推荐回答

> 我会先把 core 中的崩溃行当作受害现场，而不是直接认定为根因。先用匹配版本的二进制和符号确认哪个地址或对象已经损坏，再构造稳定复现。开发环境优先开 ASan，让越界写或 use-after-free 在发生时给出写入栈；如果已知某个地址会被改坏，而且对象地址稳定，可以在 GDB 中对它设置硬件 watchpoint，抓第一次非法写。板端不方便跑 sanitizer 时，就缩小并发和输入范围，给分配/释放、对象序号和高风险 `memcpy` 长度加日志或 canary。最后还要检查数据竞争，因为并发写也可能表现成偶现内存破坏。

## 项目连接

- `[project]` TBox voice core：真实证据是读取板端 crash/调用栈并定位日志解析与版本兼容问题；尚不能证明本人熟练完成过 core dump、watchpoint 或 sanitizer 调试。
- `[project]` V853：高风险点包括 mmap buffer 归还后的悬空引用、队列对象生命周期、partial send 的 offset、客户端并发增删和不受控的字节拷贝。

## 下一次追问

1. `next`、`step`、`finish` 分别在什么场景用？
2. `thread apply all bt` 对死锁和崩溃各能提供什么证据？
3. ASan 为什么能比最终 SIGSEGV 更早发现 use-after-free？
4. watchpoint 为什么需要地址稳定，为什么不能在对象已释放后长期依赖原地址？

## 关联知识

- [Linux 内存泄漏排查](内存泄漏排查.md)
- [移动语义与智能指针](../C++/移动语义与智能指针.md)

## 2026-10-19 新凯来：Core Dump 原理/定位再次暴露 { #xinkailai-20261019-core }

来源：[新凯来技术面 · 问题 5](../../interviews/2026-10-19-新凯来-岗位未确认技术面.md#q5)。状态继续 `[weak] [interview] [project]`，这是 **2026-09-16 岚图、10-15 C++ 岗之后第三次相关薄弱证据**（各场题型不同，不把一场多个追问重复计场数）。

- **我的现场理解：** 能说明进程崩溃、非法访问、重复释放，并用 MSD 语音上报进程反复被守护进程拉起、读取 crash/调用栈、中文日志解析与分支兼容问题的案例说明真实经历。
- **我的缺口：** 面试官同时要求“原理 → 如何定位 → 如何解决”，我只展开了业务故事，没有主动讲 `SIGSEGV/SIGABRT` 默认行为和 Core 生成条件、`ulimit -c`、`/proc/sys/kernel/core_pattern`、符号匹配、`gdb ./app core`、`bt`、`thread apply all bt`、`frame`、`info locals`。Core 调用栈记录的是崩溃现场，不保证指出最早写坏内存的指令。
- **边界：** 自动转写“扣ddp/客儿当口”大概率指 core dump，但原话保留在复盘；日志中文不能直接作为崩溃的底层解释，具体非法操作及故障函数需要回查原代码/日志。
- **下一次回测：** 先 60 秒完整复述“触发信号→Core 条件→匹配符号→各线程栈→复现/修复/回归”，再在 Linux 实机或本地容器制造一个可分析的 SIGSEGV 与越界写，用 GDB 和 ASan 分别定位。
