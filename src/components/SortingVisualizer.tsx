"use client";

import React, { useEffect, useRef } from "react";

const SortingVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let numValues = 100;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    let canvasWidth: number, canvasHeight: number;
    let values: number[] = [];
    let isSorted = false;
    let animationFrameId: number;

    const MIN_FREQUENCY = 440;
    const MAX_FREQUENCY = 880;
    const TRIANGLE_WAVE = "triangle";
    const LOW_PASS = "lowpass";

    let sorting = false;
    let paused = false;
    let speed = 1;
    let currentIndex1 = -1;
    let currentIndex2 = -1;

    const audioContext = new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    if (!audioContext) {
      console.error("Web Audio API is not supported in this browser.");
    }

    const sortingEndedEvent = new Event("sortingEnded");

    async function playSortedAnimation() {
      cancelAnimationFrame(animationFrameId);

      for (let i = 0; i < values.length; i++) {
        currentIndex1 = i;
        currentIndex2 = -1;
        playSound(values[i]);
        drawBars(i);
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      isSorted = true;
    }

    function reset() {
      sorting = false;
      paused = false;
      currentIndex1 = -1;
      currentIndex2 = -1;
      isSorted = false;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(animate);
      setCanvasSize();
      randomizeValues();
      drawBars();
    }

    function drawBars(greenUpToIndex = -1) {
      const barWidth = canvasWidth / numValues;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let i = 0; i < values.length; i++) {
        const height = values[i];

        if (isSorted) {
          ctx.fillStyle = "green";
        } else if (i <= greenUpToIndex) {
          ctx.fillStyle = "green";
        } else if (i === currentIndex1) {
          ctx.fillStyle = "green";
        } else if (i === currentIndex2) {
          ctx.fillStyle = "red";
        } else {
          ctx.fillStyle = "white";
        }

        ctx.fillRect(i * barWidth, canvasHeight - height, barWidth, height);

        if (barWidth > 1) {
          ctx.strokeStyle = "black";
          ctx.strokeRect(i * barWidth, canvasHeight - height, barWidth, height);
        }
      }
    }

    function setCanvasSize() {
      canvas.width = window.innerWidth * 0.8;
      canvas.height = 400;
      canvasWidth = canvas.width;
      canvasHeight = canvas.height;
      if (values.length > 0) {
        drawBars();
      }
    }

    async function playSound(value: number) {
      const frequency =
        MIN_FREQUENCY +
        (MAX_FREQUENCY - MIN_FREQUENCY) * (value / canvasHeight);

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      oscillator.type = TRIANGLE_WAVE as OscillatorType;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

      filter.type = LOW_PASS as BiquadFilterType;
      filter.frequency.setValueAtTime(1000, audioContext.currentTime);

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.05,
        audioContext.currentTime + 0.01
      );

      oscillator.start();

      await new Promise<void>((resolve) => {
        oscillator.stop(audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + 0.1
        );
        oscillator.onended = () => resolve();
      });
    }

    function randomizeValues() {
      values = Array.from(
        { length: numValues },
        (_, i) => (i + 1) * (canvasHeight / numValues)
      );

      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
    }

    async function bubbleSort() {
      sorting = true;
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values.length - i - 1; j++) {
          if (!sorting) return;
          while (paused) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          currentIndex1 = j;
          currentIndex2 = j + 1;

          if (values[j] > values[j + 1]) {
            playSound(values[j]);
            [values[j], values[j + 1]] = [values[j + 1], values[j]];
          }

          await new Promise((resolve) => setTimeout(resolve, speed));
        }
      }
      sorting = false;
      currentIndex1 = -1;
      currentIndex2 = -1;
      document.dispatchEvent(sortingEndedEvent);
    }

    async function quickSort(arr: number[], low: number, high: number) {
      async function partition(
        arr: number[],
        low: number,
        high: number
      ): Promise<number> {
        const pivot = arr[high];
        let i = low - 1;

        for (let j = low; j <= high - 1; j++) {
          if (!sorting) return -1;
          while (paused) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          if (arr[j] < pivot) {
            i++;
            [arr[i], arr[j]] = [arr[j], arr[i]];
            currentIndex1 = i;
            currentIndex2 = j;
            playSound(arr[i]);
            await new Promise((resolve) => setTimeout(resolve, speed));
          }
        }
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        currentIndex1 = i + 1;
        currentIndex2 = high;
        playSound(arr[i + 1]);
        await new Promise((resolve) => setTimeout(resolve, speed));
        return i + 1;
      }

      if (low < high) {
        const pi = await partition(arr, low, high);
        if (pi === -1) return;
        await quickSort(arr, low, pi - 1);
        if (!sorting) return;
        await quickSort(arr, pi + 1, high);
      }
      if (low === 0 && high === arr.length - 1) {
        sorting = false;
        currentIndex1 = -1;
        currentIndex2 = -1;
        document.dispatchEvent(sortingEndedEvent);
      }
    }

    const sortingAlgorithms: { [key: string]: () => Promise<void> } = {
      bubble: bubbleSort,
      quick: () => quickSort(values, 0, values.length - 1),
    };

    let currentAlgorithm = "bubble";

    function selectAlgorithm(algorithmName: string) {
      if (sortingAlgorithms[algorithmName]) {
        currentAlgorithm = algorithmName;
        reset();
        if (sorting) {
          sorting = false;
          setTimeout(() => startSorting(), 100);
        }
      }
    }

    function startSorting() {
      if (isSorted) {
        reset();
      }

      if (!sorting) {
        sorting = true;
        isSorted = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(animate);
        const speedSlider = document.getElementById(
          "speedSlider"
        ) as HTMLInputElement;
        if (speedSlider) {
          setSpeed(parseInt(speedSlider.value));
        }
        sortingAlgorithms[currentAlgorithm]();
      }
    }

    function togglePause() {
      paused = !paused;
    }

    function setSpeed(newSpeed: number) {
      speed = 101 - newSpeed;
    }

    function animate() {
      drawBars();
      animationFrameId = requestAnimationFrame(animate);
    }

    document.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
      }
    });

    setCanvasSize();
    animationFrameId = requestAnimationFrame(animate);
    reset();

    window.addEventListener("resize", setCanvasSize);

    const speedSlider = document.getElementById(
      "speedSlider"
    ) as HTMLInputElement;
    const algorithmSelect = document.getElementById(
      "algorithmSelect"
    ) as HTMLSelectElement;
    const resetButton = document.getElementById(
      "resetButton"
    ) as HTMLButtonElement;
    const startButton = document.getElementById(
      "startButton"
    ) as HTMLButtonElement;
    const barCountInput = document.getElementById(
      "barCount"
    ) as HTMLInputElement;

    if (speedSlider) {
      speedSlider.addEventListener("input", () => {
        setSpeed(parseInt(speedSlider.value));
      });
      setSpeed(parseInt(speedSlider.value));
    }
    if (algorithmSelect)
      algorithmSelect.addEventListener("change", () =>
        selectAlgorithm(algorithmSelect.value)
      );
    if (resetButton) resetButton.addEventListener("click", reset);
    if (startButton) startButton.addEventListener("click", startSorting);
    if (barCountInput) {
      barCountInput.addEventListener("change", () => {
        numValues = parseInt(barCountInput.value);
        reset();
      });
    }

    document.addEventListener("sortingEnded", playSortedAnimation);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", setCanvasSize);
      document.removeEventListener("keydown", (event) => {
        if (event.code === "Space") {
          event.preventDefault();
          togglePause();
        }
      });
      if (speedSlider)
        speedSlider.removeEventListener("input", () =>
          setSpeed(parseInt(speedSlider.value))
        );
      if (algorithmSelect)
        algorithmSelect.removeEventListener("change", () =>
          selectAlgorithm(algorithmSelect.value)
        );
      if (resetButton) resetButton.removeEventListener("click", reset);
      if (startButton) startButton.removeEventListener("click", startSorting);
      if (barCountInput) {
        barCountInput.removeEventListener("change", () => {
          numValues = parseInt(barCountInput.value);
          reset();
        });
      }
      document.removeEventListener("sortingEnded", playSortedAnimation);
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} id="sortCanvas" height="400"></canvas>
      <div className="controls">
        <div className="speed-control">
          <input
            type="range"
            min="1"
            max="100"
            defaultValue="100"
            id="speedSlider"
          />
          <label htmlFor="speedSlider">Speed: Slow ← → Fast</label>
        </div>
        <div className="bar-count-control">
          <input
            type="number"
            id="barCount"
            min="10"
            max="2000"
            defaultValue={numValues}
            step="10"
          />
          <label htmlFor="barCount">Bars</label>
        </div>
        <div className="algorithm-select">
          <select id="algorithmSelect" defaultValue="bubble">
            <option value="bubble">Bubble Sort</option>
            <option value="quick">Quick Sort</option>
          </select>
        </div>
        <div className="buttons">
          <button id="startButton">Start</button>
          <button id="resetButton">Reset</button>
        </div>
      </div>
    </div>
  );
};

export default SortingVisualizer;
