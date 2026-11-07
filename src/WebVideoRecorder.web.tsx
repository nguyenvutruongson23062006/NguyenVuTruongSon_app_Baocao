/// <reference lib="dom" />
// Phần quay webcam dành riêng cho trình duyệt, theo yêu cầu bổ sung của người dùng.
import React, { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Button, s } from "./ui";
import type { RecorderProps } from "./WebVideoRecorder";

export default function WebVideoRecorder({ onClose, onUse }: RecorderProps) {
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownedUrl = useRef("");
  const alive = useRef(true);
  const opening = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    };
  }, []);

  async function enableCamera() {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        throw new Error(
          "Trình duyệt chưa hỗ trợ quay webcam. Hãy mở app trực tiếp bằng Chrome/Edge tại localhost hoặc HTTPS.",
        );
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      if (!alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (preview.current) {
        preview.current.srcObject = media;
        await preview.current.play();
      }
      setReady(true);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (alive.current)
        setError(
          cause instanceof DOMException
            ? "Không mở được webcam/micro. Hãy cho phép Camera và Micro, đóng ứng dụng đang dùng webcam và thử lại. Nếu dùng khung giả lập, mở app trực tiếp ở localhost."
            : cause instanceof Error
              ? cause.message
              : "Không mở được webcam.",
        );
    } finally {
      opening.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function start() {
    if (!stream.current || recorder.current?.state === "recording") return;
    setError("");
    if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    ownedUrl.current = "";
    setResult("");
    try {
      const mimeType = [
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(stream.current, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_000_000,
      });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let size = 0;
      let failed = false;
      capture.ondataavailable = (event) => {
        size += event.data.size;
        if (size > 100 * 1024 * 1024) {
          failed = true;
          if (capture.state === "recording") capture.stop();
          if (alive.current)
            setError("Video vượt 100 MB. Hãy quay lại đoạn ngắn hơn.");
        } else if (!failed && event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        failed = true;
        if (alive.current) setError("Không ghi được video. Hãy thử lại.");
      };
      capture.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false);
        if (failed) return;
        const blob = new Blob(chunks, {
          type: capture.mimeType || mimeType || "video/webm",
        });
        if (!blob.size) {
          setError("Chưa có nội dung video. Hãy quay lại.");
          return;
        }
        ownedUrl.current = URL.createObjectURL(blob);
        setResult(ownedUrl.current);
      };
      capture.start(1000);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (capture.state === "recording") capture.stop();
      }, 300_000);
    } catch {
      setError("Không bắt đầu quay được. Hãy dùng Chrome/Edge hoặc thử lại.");
    }
  }

  return (
    <Modal visible onRequestClose={onClose} animationType="slide">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 14,
          backgroundColor: "#fcfaf3",
          flexGrow: 1,
        }}
      >
        <Text style={s.title}>Quay video hướng dẫn</Text>
        <Text style={s.muted}>
          Cho phép webcam và micro. Mỗi lần quay tối đa 5 phút, 100 MB.
        </Text>
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          aria-label="Hình ảnh trực tiếp từ webcam"
          style={{
            width: "100%",
            maxHeight: 320,
            background: "#172a23",
            borderRadius: 18,
            display: result ? "none" : "block",
          }}
        />
        {!!result && (
          <video
            src={result}
            controls
            playsInline
            aria-label="Xem lại video vừa quay"
            style={{
              width: "100%",
              maxHeight: 320,
              background: "#172a23",
              borderRadius: 18,
            }}
          />
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: "#be4038" }}>
            {error}
          </Text>
        )}
        {!ready && (
          <Button
            title={busy ? "Đang mở camera..." : "Bật camera và micro"}
            disabled={busy}
            onPress={enableCamera}
          />
        )}
        {ready && (
          <Button
            title={
              recording ? "Dừng quay" : result ? "Quay lại" : "Bắt đầu quay"
            }
            onPress={() => (recording ? recorder.current?.stop() : start())}
          />
        )}
        {recording && (
          <Text style={{ color: "#be4038", fontWeight: "700" }}>
            ● Đang quay video…
          </Text>
        )}
        {!!result && !recording && (
          <Button
            title="Dùng video này"
            onPress={() => {
              // Chuyển quyền giữ URI cho biểu mẫu, không thu hồi khi đóng hộp quay.
              ownedUrl.current = "";
              onUse(result);
            }}
          />
        )}
        <Button
          secondary
          title={recording ? "Hủy quay và đóng" : "Đóng"}
          onPress={onClose}
        />
        <Text style={s.muted}>
          Video thử trên trình duyệt chỉ dùng trong phiên hiện tại; tải lại
          trang sẽ cần chọn hoặc quay lại.
        </Text>
      </ScrollView>
    </Modal>
  );
}
