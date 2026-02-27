package com.example.api.story;

/**
 * 小说类型枚举
 */
public enum StoryType {
    /**
     * 传统小说 - 作者完成全部内容，读者只阅读
     */
    TRADITIONAL,
    
    /**
     * 互动故事 - 作者提供开头和分支，读者选择，AI续写
     */
    INTERACTIVE
}
