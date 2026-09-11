# 文件描述符与 Socket

状态：`[weak] [wrong] [interview]`

## 面试问题

真实面试中被连续问过：

1. Socket 为什么能实现跨进程通信？
2. 四个进程两两通信，怎么区分不同的 Socket？
3. 文件描述符 fd 是怎么分配出来的？

来源：[2026-08-13 字节跳动 · 多媒体开发一面](../../interviews/2026-08-13-字节跳动-多媒体开发一面.md)

## 我当时的理解

我当时主要从“Socket API 怎么使用”回答：`connect / accept / IP / port`；问到多个进程如何区分 Socket 时，我又把 fd 当成了跨进程全局唯一的标识。

当时的核心错误是：

> “四个进程之间，它通信的 Socket 的文件描述符应该也是不一样的吧。”

`fd` 不是全局唯一 ID。它只是在**当前进程自己的文件描述符表里的索引**。

所以完全可能：

```text
Process A: fd = 3 -> socket A
Process B: fd = 3 -> socket B
```

两边的 `3` 没有冲突，因为它们查的是不同进程自己的 fd table。

## 现在的理解

用户态看到的 fd 只是一个整数句柄。Linux 内核关系可以先粗略理解成：

```text
task_struct
    ↓
files_struct
    ↓
fdtable
    ↓
fd = 3
    ↓
struct file
    ↓
struct socket
    ↓
struct sock
```

所以：

- `socket()` 创建/取得 Socket 相关内核对象后，在当前进程 fd table 里找空闲槽位，返回槽位索引。
- `accept()` 对一个新的已建立连接创建对应 connected socket，并在当前进程里再返回一个新的 connfd。
- fd 用于**当前进程内部**找到内核对象。
- TCP 连接本身在内核里还需要本地/远端地址、端口、协议和连接状态等信息来标识和管理。

服务端的直觉模型：

```text
listen_fd
    |
    +-- accept -> conn_fd 5 -> client A
    +-- accept -> conn_fd 6 -> client B
    +-- accept -> conn_fd 7 -> client C
```

## Socket 为什么能跨进程通信？

不要只回答“因为有 `connect/accept/send/recv` API”。

更应该回答：两个用户进程虽然地址空间隔离，但 Socket 是由内核维护的通信对象。发送进程通过 fd 进入内核，把数据交给 Socket 缓冲区/协议处理逻辑；内核再把数据送到目标 Socket 的接收侧；接收进程通过自己的 fd 读取，所以两个进程不需要直接访问对方用户态内存。

如果只做同机 IPC，还要想到 Unix Domain Socket，不必机械地把所有 Socket 都理解成“IP + 端口”。

## 易错点

- `[wrong]` fd 不是系统全局唯一。
- `[wrong]` “不同连接 = 不同 fd”只适合站在**同一个进程内部**描述，不能跨进程直接比较 fd 数值。
- `listen_fd` 和 `accept()` 返回的 `connfd` 不是同一个 Socket 状态。
- 面试官问“如何实现”时，不要自动退化成 API 使用教程；先判断是在问用户态用法还是内核机制。

## 项目连接

`[project]` V853 流媒体服务器：多客户端接入时，可以自然连接到 `listen -> accept -> connfd -> epoll`。下一次项目介绍不能只说“用 epoll 管多个客户端”，还应该能回答每个连接对应什么 fd、fd 通过什么结构关联 Socket、客户端断开后对象生命周期如何结束。

`[project]` TBox IPC：如果提到 IPC 中间件底层使用 Socket，要能区分 Unix Domain Socket 与 TCP/UDP Socket，并说明为什么进程隔离后仍可以通过内核对象交换数据。

## 面试追问

- 为什么两个进程都可以有 fd=3？
- `open()`、`socket()`、`accept()` 返回 fd 的共同点是什么？
- `dup()` 后两个 fd 是什么关系？
- `fork()` 后父子进程的 fd 为什么可能指向同一个 open file description？
- `epoll` 管理多个客户端时，event 里的 fd 最终指向什么？
- TCP 服务器到底怎么区分多个连接？

## 来源

- [2026-08-13 字节跳动 · 多媒体开发一面](../../interviews/2026-08-13-字节跳动-多媒体开发一面.md)
- 原始资料：[Linux / 网络编程](../../linux服务器.md)
