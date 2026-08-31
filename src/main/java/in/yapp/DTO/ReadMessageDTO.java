package in.yapp.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class ReadMessageDTO {

    private UUID conversationId;
    private UUID messageId;
}