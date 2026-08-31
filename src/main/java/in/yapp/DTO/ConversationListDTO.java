package in.yapp.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class ConversationListDTO {

    private UUID conversationId;
    private UUID userId;
    private String username;
    private String displayName;
    private String lastMessage;
    private Instant lastMessageAt;
    private long unreadCount;



}
