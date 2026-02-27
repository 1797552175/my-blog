package com.example.api.story;

import com.example.api.story.dto.AiWritingRequest;
import com.example.api.story.dto.AiWritingResponse;

/**
 * AI辅助写作服务
 */
public interface AiWritingService {

    /**
     * AI辅助写作
     *
     * @param username 用户名
     * @param request  写作请求
     * @return 写作响应
     */
    AiWritingResponse write(String username, AiWritingRequest request);

    /**
     * 流式AI辅助写作
     *
     * @param username 用户名
     * @param request  写作请求
     * @param callback 流式回调
     */
    void streamWrite(String username, AiWritingRequest request, StreamWriteCallback callback);

    /**
     * 流式写作回调接口
     */
    interface StreamWriteCallback {
        void onChunk(String chunk);
        void onComplete();
        void onError(Throwable throwable);
    }
}
