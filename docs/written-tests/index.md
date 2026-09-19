# 笔试复盘

这里集中保存笔试、在线测评和代码题练习。左侧目录按日期倒序自动生成，以后新增 `docs/written-tests/*.md` 后会自动出现，不再只能从正文超链接进入。

## 最近复盘

### 2026-09-20

- [状态设计、回溯与二分答案复盘](2026-09-20-状态设计回溯与二分答案复盘.md) `[written-test]` `[weak]` `[learning]`
  - 核心：P5428 的 `dp[已选数量][最后位置]` 状态与滑动窗口最小值；动态 `t` 不能写死多层循环，回溯中的全局 `chosen` 是隐藏状态；二分答案 check 中向上取整、`<=` 与 long long 边界。
### 2026-09-18

- [算法笔试复盘：树苗矩形与 IPv4 十六进制转换](2026-09-18-算法笔试复盘.md) `[written-test]` `[weak]` `[learning]`
  - 核心：9×9 小网格优先直接枚举 1296 个矩形；复盘 `for(j...;...;i++)` 死循环、边界判断顺序、off-by-one 等实现问题；补充字符串/整数/十六进制转换与 `stringstream`。
### 2026-09-14

- [01 序列连续合并计数复盘](2026-09-14-01序列连续合并计数复盘.md) `[written-test]` `[weak]`
  - 核心：把反复相邻合并转化成原数组连续分段，再按相邻 `1` 的零间隙使用乘法原理。
  - 关联练习：[LeetCode 2147 分隔长廊的方案数](https://leetcode.cn/problems/number-of-ways-to-divide-a-long-corridor/) · [LeetCode 1573 Number of Ways to Split a String](https://leetcode.com/problems/number-of-ways-to-split-a-string/) · [LeetCode 2266 统计打字方案数](https://leetcode.cn/problems/count-number-of-texts/)

### 2026-09-12

- [算法笔试练习复盘](2026-09-12-算法笔试练习复盘.md)
  - 核心：算法模式识别、状态定义和 C++ 实现稳定性；覆盖二分答案、单调栈、状态扩图、最短路、欧拉路径等。

## 复习入口

- [薄弱点地图](../weakness-map.md)：查看重复出错次数和训练优先级。
- [当前复习状态](../knowledge/STATUS.md)：按 `[weak]` / `[wrong]` / `[learning]` 回测。
- [数据结构与算法知识页](../knowledge/算法/算法题模式识别与状态设计.md)：只看可迁移的模型和固定触发规则。

## 维护规则

1. 复盘页保留题目、我的原始思路、判断、正确模型、代码和错误类型。
2. 可迁移的算法模式归并到 `docs/knowledge/算法/`，不为每道题机械新建知识页。
3. 高相关练习题放进“关联练习”，注明关联点与训练目标，不只堆裸链接。
4. 题面缺失处明确标记，不根据印象补造样例或条件。
