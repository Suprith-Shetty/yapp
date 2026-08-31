package in.yapp.Service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UploadRateLimiter {

    private static final int MAX_UPLOADS = 20;
    private static final long WINDOW_SECONDS = 60 * 60;

    private final ConcurrentHashMap<UUID, Deque<Instant>> uploads =
            new ConcurrentHashMap<>();

    public boolean allowUpload(UUID userId) {

        Instant now = Instant.now();
        Instant windowStart =
                now.minusSeconds(WINDOW_SECONDS);

        Deque<Instant> timestamps =
                uploads.computeIfAbsent(
                        userId,
                        key -> new ArrayDeque<>()
                );

        synchronized (timestamps) {

            // Remove uploads older than one hour
            while (!timestamps.isEmpty()
                    && timestamps.peekFirst()
                    .isBefore(windowStart)) {

                timestamps.removeFirst();
            }

            // Limit reached
            if (timestamps.size() >= MAX_UPLOADS) {
                return false;
            }

            // Record this upload
            timestamps.addLast(now);

            return true;
        }
    }
}