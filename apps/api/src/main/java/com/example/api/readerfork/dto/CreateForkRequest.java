package com.example.api.readerfork.dto;

/**
 * 创建阅读副本时的可选参数
 */
public record CreateForkRequest(
        /** 从第几章开始续写（作者章节序号），null 表示从开头 */
        Integer fromChapterSortOrder
) {
}
